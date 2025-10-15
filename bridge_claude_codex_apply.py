#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bridge Claude <-> Codex avec protocole JSON, scoring /5, et application conditionnelle des changements.
- Tourne en console : pose une question, observe le ping-pong, applique si double 5/5.
- Actions fichier limitées et loggées : replace, patch_block, append.
- Sécurité : ne touche qu'au sous-dossier "workspace_root" (par défaut: cwd).
"""

import os, sys, json, time, re
from pathlib import Path
from typing import List, Dict, Any, Tuple
from openai import OpenAI
import anthropic

# --------- CONFIG GÉNÉRALE ----------
TURN_LIMIT = 5            # max échanges (A->B->A ... compte 1 par message)
COOLDOWN_SEC = 0.25       # respiration entre appels
WORKSPACE_ROOT = Path(os.environ.get("WORKSPACE_ROOT", ".")).resolve()
APPLY_IMMEDIATELY_ON_DOUBLE_5 = True

# Modèles (adapte selon ton compte)
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")

# Délimiteur de fin de message (sécurité textuelle, même si on passe en JSON)
DELIM = "<<<END>>>"

# --------- CLIENTS API ----------
oa = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
an = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# --------- PROMPTS DE RÔLE (protocoles stricts) ----------
JSON_SCHEMA_DOC = r"""
Tu DOIS répondre EXCLUSIVEMENT en JSON valide suivant ce schéma:

{
  "score": 1-5,                          // entier, ta confiance sur 5
  "summary": "analyse brève",
  "advice": "conseils concis",
  "changes": [
    {
      "action": "replace" | "patch_block" | "append",
      "path": "chemin/relatif/depuis/workspace_root",
      "content": "contenu EXACT à écrire/coller",
      // pour patch_block (remplacement ciblé)
      "find": "texte exact (ou regex si 'regex': true) à remplacer",
      "regex": true | false
    }
  ]
}

Contraintes:
- Respecte strictement le JSON. AUCUN texte autour.
- Ne propose que des chemins SOUS workspace_root.
- Pas d'exécution de commandes, pas d'accès réseau.
- Évite les changements massifs inutiles : vise des diffs minimaux et sûrs.
"""

SYS_CLAUDE = (
    "Tu es CLAUDE (analyste principal). "
    "Objectif: analyser la question utilisateur, diagnostiquer, puis PROPOSER des modifications de code ciblées. "
    "Tu donnes un score de confiance (1-5). "
    "Ta sortie DOIT respecter le schéma JSON ci-dessous. "
    + JSON_SCHEMA_DOC
)

SYS_CODEX = (
    "Tu es CODEX (relecteur-correcteur). "
    "Objectif: prendre la proposition de CLAUDE, la CRITIQUER, AMÉLIORER, ajouter commentaires et corrections concrètes. "
    "Tu redonnes un score (1-5) et une liste de 'changes' prête à appliquer. "
    "Si la proposition est risquée, diminue le score et propose une variante plus sûre/minimale. "
    "Ta sortie DOIT respecter le schéma JSON ci-dessous. "
    + JSON_SCHEMA_DOC
)

# --------- OUTILS I/O JSON ---------
def parse_first_json_block(text: str) -> Dict[str, Any]:
    """Extrait le premier bloc JSON valide trouvé dans 'text'."""
    # Cherche la première accolade ouvrante… jusqu’à la dernière fermante plausible
    candidates = re.findall(r"(\{.*\})", text, flags=re.S)
    for cand in candidates:
        try:
            return json.loads(cand)
        except Exception:
            continue
    # Tentative stricte si tout échoue:
    text_stripped = text.strip()
    if text_stripped.startswith("{") and text_stripped.endswith("}"):
        return json.loads(text_stripped)
    raise ValueError("Réponse sans JSON valide.")

# --------- APPELS IA ----------
def ask_claude(user_msg: str, context_for_claude: str = "") -> Dict[str, Any]:
    msgs = [{"role": "user",
             "content": user_msg + ("\n\n" + context_for_claude if context_for_claude else "")}]
    r = an.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=1200,
        temperature=0.3,
        system=SYS_CLAUDE,
        messages=msgs,
    )
    text = "".join([p.text for p in r.content if getattr(p, "type", None) == "text"])
    return parse_first_json_block(text)

def ask_codex(user_msg: str, context_for_codex: str = "") -> Dict[str, Any]:
    r = oa.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": SYS_CODEX},
            {"role": "user", "content": user_msg + ("\n\n" + context_for_codex if context_for_codex else "")},
        ],
        temperature=0.3,
        max_tokens=1200,
    )
    text = r.choices[0].message.content or ""
    return parse_first_json_block(text)

# --------- APPLICATION DES CHANGEMENTS ----------
def safe_relpath(path_str: str) -> Path:
    p = (WORKSPACE_ROOT / path_str).resolve()
    if WORKSPACE_ROOT not in p.parents and p != WORKSPACE_ROOT:
        raise ValueError(f"Chemin hors workspace_root: {p}")
    return p

def apply_change(change: Dict[str, Any]) -> Tuple[bool, str]:
    action = change.get("action")
    path = change.get("path")
    content = change.get("content", "")
    if not action or not path:
        return False, "change incomplet (action/path manquant)."

    target = safe_relpath(path)
    target.parent.mkdir(parents=True, exist_ok=True)

    if action == "replace":
        target.write_text(content, encoding="utf-8")
        return True, f"[replace] {path}"

    elif action == "append":
        prev = target.read_text(encoding="utf-8") if target.exists() else ""
        target.write_text(prev + content, encoding="utf-8")
        return True, f"[append] {path}"

    elif action == "patch_block":
        find = change.get("find")
        regex = bool(change.get("regex", False))
        if not find:
            return False, "patch_block sans 'find'."
        text = target.read_text(encoding="utf-8") if target.exists() else ""
        if regex:
            try:
                new_text, n = re.subn(find, content, text, flags=re.S)
            except re.error as e:
                return False, f"regex invalide: {e}"
            if n == 0:
                return False, f"rien trouvé pour regex dans {path}"
            target.write_text(new_text, encoding="utf-8")
            return True, f"[patch_block/regex x{n}] {path}"
        else:
            if find not in text:
                return False, f"bloc 'find' introuvable dans {path}"
            new_text = text.replace(find, content, 1)
            target.write_text(new_text, encoding="utf-8")
            return True, f"[patch_block] {path}"

    else:
        return False, f"action inconnue: {action}"

def apply_changes(changes: List[Dict[str, Any]]) -> List[str]:
    logs = []
    for ch in changes or []:
        try:
            ok, msg = apply_change(ch)
        except Exception as e:
            ok, msg = False, f"ERREUR: {e}"
        prefix = "✅" if ok else "⚠️"
        logs.append(f"{prefix} {msg}")
    return logs

# --------- RUN LOOP ----------
def main():
    print(f"Workspace root: {WORKSPACE_ROOT}")
    if not WORKSPACE_ROOT.exists():
        print("❌ workspace_root introuvable.")
        sys.exit(1)

    if len(sys.argv) > 1:
        user_question = " ".join(sys.argv[1:])
    else:
        print("Tape ta question (ex: Pourquoi la connexion au back ne fonctionne pas ?)")
        user_question = input("> ").strip()
    if not user_question:
        print("❌ Question vide.")
        sys.exit(1)

    print("\n🚦 Début du ping-pong Claude ↔ Codex\n")
    turn = 0
    last_claude = {}
    last_codex = {}
    transcript: List[str] = []

    # Contexte minimal partagé (nos règles et format JSON)
    shared_context = (
        f"RAPPEL: Réponds en JSON STRICT selon le schéma fourni. "
        f"Ne mets aucun texte hors JSON. Workspace root: {WORKSPACE_ROOT}."
    )

    # Premier message envoyé à Claude: la question utilisateur
    current_msg_for_claude = (
        f"QUESTION_UTILISATEUR:\n{user_question}\n\n"
        "Ta mission: analyser, proposer des changements concrets minimalement intrusifs."
    )

    while turn < TURN_LIMIT:
        # ----- CLAUDE -----
        try:
            claude_json = ask_claude(current_msg_for_claude, context_for_claude=shared_context)
        except Exception as e:
            print(f"❌ Claude erreur: {e}")
            break

        c_score = int(claude_json.get("score", 1))
        c_summary = claude_json.get("summary", "")
        c_advice = claude_json.get("advice", "")
        c_changes = claude_json.get("changes", [])

        transcript.append(f"[Claude] score={c_score}/5\nsummary: {c_summary}\nadvice: {c_advice}\nchanges: {json.dumps(c_changes, ensure_ascii=False, indent=2)}\n")
        print(f"\n[Claude] score={c_score}/5")
        print(c_summary)
        if c_advice: print(f"- {c_advice}")

        # Passer à Codex le JSON de Claude (texte brut)
        codex_input = json.dumps(claude_json, ensure_ascii=False)

        time.sleep(COOLDOWN_SEC)

        # ----- CODEX -----
        try:
            codex_json = ask_codex(codex_input, context_for_codex=shared_context)
        except Exception as e:
            print(f"❌ Codex erreur: {e}")
            break

        d_score = int(codex_json.get("score", 1))
        d_summary = codex_json.get("summary", "")
        d_advice = codex_json.get("advice", "")
        d_changes = codex_json.get("changes", [])

        transcript.append(f"[Codex] score={d_score}/5\nsummary: {d_summary}\nadvice: {d_advice}\nchanges: {json.dumps(d_changes, ensure_ascii=False, indent=2)}\n")
        print(f"\n[Codex] score={d_score}/5")
        print(d_summary)
        if d_advice: print(f"- {d_advice}")

        # ----- CONDITION D’APPLICATION -----
        if APPLY_IMMEDIATELY_ON_DOUBLE_5 and c_score == 5 and d_score == 5:
            print("\n🏁 Double 5/5 ! Application des changements de Codex (priorité relecture) …")
            logs = apply_changes(d_changes or c_changes)
            print("\n".join(logs))
            print("\n✅ Modifications appliquées (double 5/5).")
            return

        # Prépare le prochain tour: Claude reçoit la synthèse Codex
        current_msg_for_claude = (
            "SYNTHÈSE_CODEX_JSON:\n" + json.dumps(codex_json, ensure_ascii=False) +
            "\n\nRéagis: améliore ou corrige, re-score. Respecte le même schéma JSON."
        )

        turn += 1
        time.sleep(COOLDOWN_SEC)

    # ----- FIN SANS DOUBLE 5/5 -----
    print("\n⏱️ Limite d'échanges atteinte sans double 5/5.")
    # Propose d'appliquer quand même les changements Codex (plus récents), sinon Claude
    candidate = last_codex.get("changes") if last_codex else d_changes
    if not candidate:
        candidate = c_changes

    if candidate:
        print("\nAperçu des changements proposés (dernière itération):")
        print(json.dumps(candidate, ensure_ascii=False, indent=2))
        # Demande validation utilisateur
        try:
            ans = input("\nAppliquer malgré tout ces changements ? (o/N) ").strip().lower()
        except EOFError:
            ans = "n"
        if ans == "o":
            logs = apply_changes(candidate)
            print("\n".join(logs))
            print("\n✅ Modifications appliquées (validation manuelle).")
        else:
            print("\n🙅 Aucune modification appliquée.")
    else:
        print("\n🙅 Aucune modification proposée à appliquer.")

if __name__ == "__main__":
    main()
