
Ceci un recapitulatif des fonctionnalités du projet trackbee_v0.0.1as tu bien pris note 

# Généralités

lien sur disque:
trackbee_app : C:\Users\fanjo\Documents\1. Dev\2. Projet - Site\12.FTTOPO\2.TrackBee\3.Dev\2.Front\trackbee_app
trackbee_iot: C:\Users\fanjo\workspace\trackbee_v6 ou (C:\Users\fanjo\workspace\trackbee_v{numero de derniere version})
trackbee_base:C:\Users\fanjo\Documents\1. Dev\2. Projet - Site\12.FTTOPO\2.TrackBee\3.Dev\3.Back\trackbee_back
trackbee_python: C:\Users\fanjo\Documents\1. Dev\2. Projet - Site\12.FTTOPO\2.TrackBee\3.Dev\3.Back\trackbee_python


## But et fonction de chaque partie, (fait ou a faire) :

* Trackbee_iot :Le trackbee_iot (esp32C6 + carte simplertk2B + batterie 18650 + carte sd + carte sim (a venir)) peut etre programmé pour enregistrer des observations gnss satellitte pendant un laps de temps donné sur une periode donnee. Ces informations sont trnasmises a l'app ou par liaison wifi ou par liaison gsm (a venir)
* trackbee_app : L'app, installé sur un smatphone, elle doit communiquer entre le back et l'iot. En BLE pour la communication et wifi pour le telechargement de donnee.
* trackbee_back :Le back en nodejs , gere les utilisateurs , les donnees, realise la passerelle entre l'iot/app et serveur python qui calcule les corrections de positions gnss
* trackbee_python:  essentiellement le programme RTKLIB qui accepte un fichier d'observation et renvoie des coordonnee corrigées

## fonctionnement general
Trackbee_iot est un iot qui se gere par une app , cette app (react + capacitor+ tailwindcss+ headlessui+lucide react ,..) est connectée a un back (en nodejs), ce back fait appel a un contener docker en python (trackbee_python) pour realiser des calculs de post traitement.

Le but de trackbee est de pouvoir suivre l'evolution d'un point dans le temps sans intervention humaine avec un minimum de connaissance technique et un minimum de temps d'instalation.


Dans tous les cas , un utilisateur doit etre 'proprietaire' d'un ou plusieurs iot. il devient 'MODERATOR'. Ce moderator cree un site. Il peut attachés sur ce site ou plusieurs trackbee_iot (que l'on appelle 'machine' dans le back).
Des que l'iot recevra un ordre de calcul unique ou différé (multiple ou pas) il sera installé ( table 'installation') sur une position. Ceci afin que si le moderator change l'iot de place , on ne confonde pas les generations de position.


## scenario type 
* Scenario 1 appelé 'static_unique_immediat' ou 'static_unique_differe': un trackbee_iot est installé pour ecouter un point immediatement pendant un laps de temps defini par le moderator (calcul 'static_unique immediat'), l'iot enregistre un fichier, le stocke (avec le campaignId comme prefixe au fichier) 
Le moderator se connecte , recupere le fichier , il est envoyé au back pour traitement (pp/upload avec campaignId, machineId,... avoir selon modification ulterieures).
Le back stocke le fichier, recherche une base RGP_ign proche , recupere le fichier d'observation, envoi a trackbee_python le fichier obs (ou obs_ubx) + fichier base_obs .
Un fichier de resultat avec les corrections est renvoyé au back. le back le stocke. 
Le moderator reçoit une push de notification (supabase - a developper) sur l'app montrant  que le resultat est disponible.
Si un nouveau calcul est demandé alors que le trackbee_iot a deja un id d'installation , le moderator doit confirmer s'il a changé de positions (ou de site) depuis la derniere instalations.
Si nouveau site, on le redirige vers creation de site, si juste de positions sur le meme site , un nouvel id d'installation est créé silencieusement.

* Scenario 2 , appelé 'static_multiple' : un trackbee_iot est installé pour ecouter un point tous les jours 1 heure pendant 2 semaine (mode static_multiple, donc 1 campagne(campaignSurvey) mais plusieurs postProcessing). 
L'utilisateur recupere l'iot en fin de campagne , se connecte (en BLE), recupere les fichiers (en wifi), les fichiers sont envoyés au back ('pp/upload' avec campaignId,...) et stockés pour calculs en post traitement.
Chaque positions (ici 14 positions) de chaque jours sera posttraitée. Un recapitulatif permettra de connaitre l'evolution du point a travers les jours d'observations. 


* Scenario 3 , appelé 'static_roverbase_multiple' (non implementés au 11/09:25): 2 trackbee_iot (ou plusieurs) sont installés ensemble sur le meme site (meme site mais pas meme id d'installation (un id d'installation par iot)).
Le premier sur un point fixe ne bougeant pas et devient le trackbee_iot_base et l'autre (ou les autres) dont on doit connaitre l'evolution XYZ sera (ou seront) le(s) trackbee_iot_rover.
LEs  iot seront programmer en meme temps pour la meme mission , ils seront 'attachés' mais avec une fonction differente. 
Le trackbee_iot_base : devra enregistrer des que possible des observations gnss pendant un laps de temps minimum parametrable (par default 3h) en mode parametre avancés (mode a implementés, stocké une table en back pour que chaque iot est des parametres propre 6 ajouter a la page 'deviceDetail' un bouton 'parametres avancés' exemple: type d'antenne gps installée, generation du firmware, type de batteire,.. )
Ce trackbee_iot_base aura une position calculée des le depart et permettra de fournir un fichier 'base_obs' pour le calcul des corrections des autres trackbee_iot. 
Ce trackbee_base pourrait recevoir les donnees des trackbee_iot_rover par zigbee et les stocké ou les transmettre si liaison (wifi ou gsm), realiser un checkup regulier, avertir si un rover manque a l'appel, faire une alerte si mouvement inhabituel ou au dessu s d'une limite parametrable,..Toute ces infos devoront etre parmatrable sur la fiche d'instalaltion de la base.
DES l'activation de la commande calcul il pourrait sympa de voir sur une carte l'etat du reseau de tous les trackbee_rover avec des points de santé en temps reel.
Ensuite chaque trackbee_iot_rover seront dans un scenario 'static_multiple' mais il sera important de conserver quel type de base a ete utilisée.


## trackbee_app :

### Description graphique :

L'app trackebee_app est destinée a des smartphones ou tablette. Le design est responsive.
Réalisée en react / capacitor / tailwindcss / headlessui / lucidreact
L'app dispose d'un espace 'public' et d'un espace 'connecté'.

La structure graphique de l'app se decompose en 3 parties: 
* en haut un bandeau (ajusté sous les icones systeme du smartphone) montre (de gauche a droite): un logo , le nom de l'app 'Trackbee' , une icone 'USER' permettant de se connecter (si non connecté) ou acceder a son profil (si connecté) et un hamburger (sur smartphone ) sinon les menus (sur grand ecran.)
* un body 
* en bas un bandeau (visible uniquement pour les personnes connectés) montrant 4 icones ajusté au dessus des icones systemes (les 4 icones sont : 'site' symbolisé par une icone de 'position', 'trackbee' symobilisé par une icone 'wifi', 'parametres symbolisée par une icone 'roue crantée' et 'profil' symbolisée par un 'user')

Tous les styles de boutons , color-background , polices, color,.. pourront etre ajustée de maniere simple par themes si besoin en changeant quelques parametres. 

Sur grand ecran, l'app ne prendra pas toute la largeur de l'ecran. 

l'espace public montre une homepage, une page explicative, une page 'contact'.


### Description technique :
#### Introduction:
Les routes sont gerees par react-router.
L'enregistrement des variables et autres donnees par 'idb-keyval'.
Plusieurs type de droits:
'VIEWER' : personne ayant la possibilité de voir les resultats d'un  trackbee_iot
'USER' : personne ayant la possibilité d'interagir avec un trackbee_iot
'MODERATOR' : comme USER mais personne proprietaire du trackbee_iot pouvant ajouter ou supprimer des 'USER' et 'VIEWER'
'ADMIN': tous les droits

#### Fonctionnement:
* page 'Site' :
Accessible depuis l'icone 'site', elle affiche tous les sites de l'utilisateur.
Un click sur un site permet d'ouvrir la page du site.
Cette page du site contient :
** les informations des iot installé
** sa position geographique
** le systeme de coordonnees attaché au site (exemple : lambert 2 cc50)
** les "USER" autorisé a s"y connecter

Un utilisateur connecté pourra creer un site, un site est une position geographique (exemple: un chantier de construction), ce site peut etre visualisé sur une carte. 
Un site peut contenir plusieurs 'installation', chaque installation correspond a la position d'un iot ou plusieurs iot. 

Un utilisateur connecté pourra attacher un trackbee_iot en s'y connectant en BLE, l'app en se connectant au back (envoyé le macd de l'iot + id du user) (une route sur le back dediée pourrait etre utile) determinera si :
l'iot est deja a un proprietaire ?: non -> il en deviendra proprietaire (="MODERATOR"), oui  -> le user est il autorisé par le proprietaire (="USER")a s'y connecter ? oui -> connection : non -> deconnection
Si connection a l'iot (page 'deviceDetail' , icone 'trackbee' sur l'app), se connecte grace a l'adresse '/user/device/{id}':
role MODERATOR : peut


* page 'Trackbee':
A l'ouverture de cette page, un service 'autoconnect' est lancé de façon a se connecter automatiquement en BLE a l'iot.
Ce service 'autoconnect' permet de verifier des informations au pres de l'iot (fichiers disponible, etat de la batterie,..)
En haut on trouve le nom de l'iot , macd (en petit) et le nom donné par l'utilisateur avec un symbole de 'petit crayon' permettant de le modifier.
Un bouton en haut a droite (composant 'scanBleButton') montre l'etat  de la connection l'état change  : Online' (en vert) , 'Offline'(en rouge), 'Connect..' (en orange). 
Un bouton en haut a gauche (composant 'iotDownload') nommé 'Download' avec une petite puce dans le coin haut droit du bouton permet de savoir le nombre de fichier prêt a être telecharger.
Le body En dessous constitué de  4 parties, chaque partie est dans un onglet qui peut s'ouvrir en cliquant (qui ferme les autres), (par défaut toutes fermées à l'ouverture de la page): 'information' , 'Resultat', 'action', 'parametres'. 
- Partie 'information' : son macd, le nom (modifiable par l'utilisateur) , le site (si elle est attachée a un site) , si elle a une campaign en cours, son systeme de coordonnee actuelle, son etat de batterie.
- Partie 'Resultat' : (par defaut a l'affichage) une liste de resultats, en haut le dernier, (le model surveyCampaign.status indique l'etat du calcul 'draft', 'active', 'paused', 'done', 'canceled') . Ces resultats ne doivent affiché que le dernier 'active' ou 'paused' et 'done' appartenant au site actuel. 
Chaque ligne de resultats peut etre cliqués afin d'acceder a la page du resultats (resultDetail.page) montrant les date depart et fin, etat , resultats, le type de calculs (STATIC_UNIQUE,...)
Un bouton en bas de resultats permet d'acceder a une page montrant une liste de tous les resultats de tous les sites.
- Partie 'Action' : C'est la partie qui permet de lancer des ordres au trackbee : STATIC_UNIQUE immédiat ou différé ou STATIC_MULTIPLE (plusieurs enregistrement a des heures et des jours pendant des temps donné).
La zone STATIC_UNIQUE a un input de temps (la duree d'enregistrement du fichier) avec la possibilité d'ajouter une date et une heure avec un bouton 'Démarrer'
La zone STATIC_MULTIPLE a  une date de depart, une date de fin, avec une possibilité d'ajouter des ecoutes durant la journee (la duree d'ecoute et  l'heure de declenchement) avec un bouton 'Démarrer'
Chaque zone est dans un onglet ouvert / fermé (si Static_unique ouvert alors static_multiple fermé).
Lorsque les ordres seront lancés, une modale s'ouvrira afin d'informer l'utilisateur que l'ordre est bien arrivée a l'esp , que l'esp et le back ont répondus .

* Page Parametres : les parametres par defaut des sites , trackbee , la liste des "USER" par defaut ,...

* Page profil : identifiants, mot depasse , deconnection ,... 




#### Architecture technique :

Voici une organisation “propre et pro” qui tient la route pour une app qui fait le pont IoT ↔ back, en React/Capacitor + Node/Sequelize .
L’idée : **séparer par responsabilités et par durée de vie**, tout en gardant un “cerveau” d’orchestration (ton `Session Orchestrator`) qui ne stocke presque rien, mais **coordonne**.

##### 1) Arborescence front (web + Capacitor)

src/
  app/
    AppProviders.tsx            // QueryClient, ErrorBoundary, Theme, i18n, etc.
    widgets/                    // composants UI réutilisables (cards, pills, toasts)
    pages/
      public/                   // user non connecté
        publicHome.page
        publicAbout.page
        publicContact.page
      site/
        siteList.page.jsx
        siteDetail.page.jsx
      devices/                  // domaine "machines / iot"
        deviceList.page.jsx
        deviceDetail.page.tsx
        useDeviceBundle.ts      // hook métier (lecture calcs, etc.)
        components/             // UI du domaine
      campaigns/
        CampaignList.page.tsx
        CampaignActions.part.tsx
        components/             // UI du domaine
      results/
        resultList.page.tsx
        resultDetail.page.tsx
        components/             // UI du domaine
      transfers/
        IotDownload.part.tsx    // UI transfert BLE→Wi-Fi→upload
        logs/DebugPane.tsx
        components/             // UI du domaine
  core/
    orchestrator/               // 🧠 “Session Orchestrator” (ex. ton session.store.jsx, découpé)
      OrchestratorProvider.tsx
      ble.controller.ts         // logique séquentielle côté BLE (pas le bas niveau)
      wifi.controller.ts        // handover SoftAP, “waitForOnline”, etc.
      upload.controller.ts      // file offline, retries, flush, hooks onSuccess
      session.controller.ts     // hydrate/normalize, claims/user, autorisations
      selectors.ts              // tous les sélecteurs centralisés
    services/                   // I/O *purs*, testables sans React
      ble/
        BleManager.ts           // init, connect, write/notify, MTU, errors → events
        a100.protocol.ts        // schéma JSON (cmd/notify), parse/validate (zod)
      wifi/
        SoftApClient.ts         // connect/disconnect, fetch list, stream
        HttpClient.ts           // CapacitorHttp wrapper (time-out, headers)
      api/
        http.ts                 // fetcher unique (baseURL, auth, retry)
        endpoints.ts            // fonctions d’API (getCampaigns, startInstant…)
    state/
      query/                    // TanStack Query “server cache”
        machines.queries.ts
        campaigns.queries.ts
      stores/                   // Zustand “état app par domaine”
        auth.store.ts           // flags, claims décodés (pas de token)
        device.store.ts         // {machineId, bleState, rssi, activeCampaignIds, filesByCampaign}
        job.store.ts            // {campaignId, progress, lastError}
        prefs.store.ts          // persisté (theme, defaults)
    offline/
      db.ts                     // Dexie schemas (files, logs, queue)
      storage.file.ts           // saveMany(), open folder, etc.
      queue.ts                  // add/process/clear; backoff + resume
    utils/
      logger.ts                 // logger structuré + chunker + levels
      ids.ts                    // helpers (normalizeMac, reverseBytes…)
      time.ts, env.ts
    types/
      domain.ts                 // Machine, Site, Campaign, Calc, FileMeta…
      transport.ts              // DTO API, DTO BLE notify/write
```

**Pourquoi ça marche :**

* `services/*` = **I/O pur** (BLE, Wi-Fi, HTTP), sans React, sans Zustand. Faciles à tester.
* `core/orchestrator/*` = **séquences** (connect, probe, handover, upload, reconnect). C’est ton “cerveau”.
* `state/query` gère **données serveur** (React Query).
  `state/stores` gère **états transverses éphémères** (BLE connecté, transfert en cours).
* `features/*` = **UI par domaine** (composants + hooks métier qui composent orchestrator + query + stores).

##### 2) Flux de données (lifetimes clairs)

* **Cache serveur** (React Query) : machines, campaigns, calcs, listes de fichiers **côté back**.
  Invalidations ciblées après actions (ex. `startInstant` ⇒ `invalidate(campaigns.byMachine)`).

* **État app éphémère** (Zustand) :

  * `device.store`: `connections[machineId] = {status, deviceId, macd, rssi, activeCampaigns, filesByCampaign}`
  * `job.store`: `current = {campaignId, phase, progress%, lastError}`

* **Orchestrator** publie des **événements** (ex. `'transfer:phase'`, `'ble:connected'`) auxquels les stores réagissent.

* **Persistance** :

  * **Secure Storage/Keychain** (Capacitor) pour tokens/refresh (jamais dans stores).
  * **IndexedDB (Dexie)** pour fichiers et queue offline, + journalisation locale.
  * **localStorage/Preferences** pour préférences non sensibles (thème, durées par défaut).

##### 3) Contrats de données solides (types & schémas)

**Domain types (ex. `types/domain.ts`)**

```ts
export type MachineId = number;
export type CampaignId = number;

export interface Machine {
  id: MachineId;
  macD?: string;
  installation?: { id: number; siteId: number };
}

export interface Campaign {
  id: CampaignId;
  machineId: MachineId;
  status: 'open'|'running'|'closed';
}

export interface FileMeta {
  name: string;      // "123_12122024_1245.ubx"
  size?: number;
  hash?: string;     // sha256 base16
}
```

**BLE protocole (ex. `services/ble/a100.protocol.ts`)**

* **Write** (`cmd`):

```ts
type A100Cmd =
 | { cmd:'instant'; id:CampaignId; campaignId:CampaignId; duration_s:number; cleanup:boolean; nofix?:boolean }
 | { cmd:'add_campaign'; id:CampaignId; period_s?:number; duration_s?:number }
 | { cmd:'delete_files'; id:CampaignId };
```

* **Notify** (`get_files` result) validé par **zod** :

```ts
type A100FilesNotify = {
  type:'files';
  count:number;
  files: FileMeta[];
  // SoftAP hint pour handover:
  ssid?: string; serverUrl?: string; password?: string;
}
```

**API DTO** (`services/api/endpoints.ts`)

```ts
// back renvoie toujours un tri décroissant par id côté /campaigns
getCampaigns(siteId:number, machineId:number): Promise<Campaign[]>;
startInstant(machineId:number, campaignId:number, duration_s:number): Promise<void>;
```

##### 4) Orchestration robuste (le “cerveau”)

* **Séquence transfert** (déjà bien posée chez toi) :

  1. `BleManager.connect()` (scan ciblé si besoin)
  2. `a100.getFiles({withWifiRequest:true})`
  3. **break-before-make** : `BLE.disconnect()`
  4. `SoftApClient.transfer() → StorageFile.saveMany() → upload queue`
  5. `SoftApClient.disconnect() → BleManager.reconnect() → probeFiles()`
  6. Émettre `'transfer:done'`.

* **Règles d’or** :

  * Le **fallback BLE** (transfert GATT) est **hors** du chemin “pro” ; il vit dans `transfers/advancedBleFallback.ts` et n’est appelé que sur demande.
  * Le **dernier `campaignId`** est demandé **au back** d’abord (source de vérité), sinon on prend l’“observé côté ESP” (fichiers 000123\_\*.ubx).
  * Les **logs** sont **structurés** : `scope`, `phase`, `machineId`, `campaignId`, `ms`.

##### 5) Nommer clairement pour tuer les ambiguïtés

* `machineId` ≠ `installationId` ≠ `campaignId`.
* Fonctions **verbe + ressource** : `connectAndProbe(machineId)`, `transferCampaignFiles({ machineId, campaignId })`.
* Stores : `device.store` (connectivité), `job.store` (progression d’un job), `prefs.store` (UI persistée).

##### 6) Sécurité et secrets

* **Auth** : token d’accès court + refresh httpOnly côté serveur (PKCE si OAuth).
* **Jamais** de token brut dans Zustand/React Query.
* `Secure Storage` pour l’App Capacitor, sinon cookie httpOnly + endpoints `/me` + `etag` pour hydrater.

##### 7) File offline & reprise

* `offline/queue.ts`: table Dexie `{ id, name, status:'pending'|'failed'|'done', retryCount, payload, createdAt }`.
* `process()` avec **backoff exponentiel** et **limite de retries** ; hook `onUploadSuccess` pour déclencher `delete_files` via BLE si voulu.
* `orchestrator/upload.controller.ts` expose `queue.addFiles(files, context)` et gère **flush périodique** + **flush on regain network**.

##### 8) Observabilité

* `logger.ts` : `log(scope, level, data)` + `logChunked()` pour Android.
* **Trace d’un transfert** : `transferId = ${machineId}-${campaignId}-${timestamp}` → permet de corréler logs UI, queue et backend.
* `DebugPane` lit le **buffer en mémoire** + extrait Dexie si besoin.

##### 9) Versionnage protocoles & compat

* `a100.protocol.ts` déclare `PROTOCOL_VERSION`.
* Le notify contient `fw`/`proto` → l’orchestrator choisit la bonne **stratégie** (ex. `strategy/v1`, `strategy/v2`).

##### 10) Backend (bref mais essentiel)

* **Endpoints nets** :

  * `GET /sites/:siteId/machines/:machineId/campaigns` → tri décroissant, indique `open/running`.
  * `POST /machines/:machineId/instant` body `{campaignId, duration_s, cleanup}`.
  * `POST /uploads` (multipart ou URLs signées).
  * `GET /health` (HEAD ok).

* **Idempotence** : clés de déduplication (ex. `transferId`).

* **Événements** : webhooks/WS si tu veux retour temps réel “post-traitement terminé”.

---

###### Résumé pratique

* **Couches** : Services (I/O purs) → Orchestrator (séquences) → Stores/Query (état) → UI (features/\*).
* **Données** : Query = serveur, Stores = runtime éphémère, Dexie = offline, SecureStorage = secrets, localStorage = prefs.
* **Nommer & typer** strictement\*\* campaignId/machineId\*\* pour supprimer les confusions.
* **Orchestrator** = cerveau : il ne **possède** pas la donnée, il **coordonne**.









## trackbee_back :

Le serveur 'trackbee_back' est ecrit en nodejs+express, avec un systeme de base de donnee en sequelize.




## Trackbee_iot : 

l'iot est un esp32C6 equipé d'une carte simpleRTK2B (F9P) relié par liaison uart. L'iot est equipé de plusieurs batterie 18650 et fonctionne en autonomie.
LE nom BLE de l'iot est "TRB{adresse macd sans ":"}" (exemple : TRB23E456657867)

### trackbee_iot - Materiel :


**Calcul/Radio**

* **MCU Wi-Fi/BLE** : **ESP32-C6-WROOM-1-N4** (module 4 MB QSPI, facile à certifier). Pour le proto : DevKitM-1. ([Espressif][1])

**GNSS**

* **Récepteur** : **simpleRTK2B (ZED-F9P)** — version Budget/Lite/Pro selon format & IO. ([ardusimple.com][2])
* **Antenne L1/L2** : patch **Tallysman TW3872** (préfiltree, phase center propre) + câble u.FL→SMA (RG-178) + passe-cloison SMA. ([Calian Corporate][3])

**Alimentation & supervision**

* **Buck 5 V (depuis 2S 18650 : 6–8.4 V)** : **TI TPS62133** (3 A, 3–17 V in) ou équivalent 2–3 A. ([Texas Instruments][4])
* **LDO 3,3 V** : ≥ 600 mA, faible dropout (ex. AP7361C/1 A) pour l’ESP32-C6.
* **Load-switch GNSS (coupure F9P hors session)** : **TI TPS22965** (6 A, Ron 16 mΩ). ([Texas Instruments][5])
* **Superviseur + watchdog externe** : **TI TPS3823-33** (reset + watchdog 1,6 s) vers /RESET. ([Texas Instruments][6])
* **Protection entrée** : **polyfuse PTC 0,5–1 A** + **TVS 5 V** (USB/5 V) + perles ferrite sur rails.
* **Batterie** : pack **2S2P 18650** avec **BMS 2S** (équilibrage), raccord via XT30/JST-VH. *(Conforme à ta “battery\_box” actuelle : sortie vers buck 5 V.)*

**Stockage & connectique**

* **µSD (SPI)** : socket push-push (ex. Molex 47219) + µSD **grade industriel**.
* Option : **flash QSPI** externe (si tu veux te passer de µSD).
* **Connecteurs** : u.FL/SMA RF, JST-GH/PH pour GNSS/UART/PPS, bornier pas 3,5 mm pour alim.

**IHM & service**

* **LED RGB** (statuts FSM), **bouton service** (long-press ⇒ SoftAP forcé).
* **Points de test** (PPS, UART, 5 V, 3,3 V) + **pads pogo** pour jig usine.

**Mécanique/RF**

* **Boîtier IP65** ABS/PC + presse-étoupes.
* **Plan de masse** sous l’antenne GNSS, **séparation** forte avec l’ESP (2,4 GHz) et les pistes à fort courant.

---

#### Rappels rapides d’intégration

* **Courants** : F9P \~120–200 mA + antenne active ; marge 1 A sur le 5 V ⇒ buck 2–3 A recommandé.
* **ESD/CEM** : TVS sur USB/5 V et RF, ferrites sur rails, routage séparé RF/numérique.
* **Anti-blocage** : TPS3823 vers /RESET + watchdogs internes + health-monitor côté firmware (déjà décrit).


[1]: https://www.espressif.com/sites/default/files/documentation/esp32-c6-wroom-1_wroom-1u_datasheet_en.pdf?utm_source=chatgpt.com "esp32-c6-wroom-1_wroom-1u_datasheet_en.pdf"
[2]: https://www.ardusimple.com/product/simplertk2b/?utm_source=chatgpt.com "simpleRTK2B Budget (u-blox ZED-F9P) multiband RTK ..."
[3]: https://www.calian.com/advanced-technologies/gnss_product/tw3872-dual-band-gnss-antenna-pre-filtered/?utm_source=chatgpt.com "TW3872 Dual Band GNSS Antenna (Pre-filtered)"
[4]: https://www.ti.com/product/TPS62133?utm_source=chatgpt.com "TPS62133 data sheet, product information and support"
[5]: https://www.ti.com/lit/gpn/TPS22965?utm_source=chatgpt.com "TPS22965 5.7-V, 6-A, 16-mΩ On-Resistance Load Switch ..."
[6]: https://www.ti.com/product/TPS3823?utm_source=chatgpt.com "TPS3823 data sheet, product information and support"


### trackbee_iot - Architecture technique


 A. Côté appareil (firmware & hardware)

* **Acquisition GNSS double fréquence prête post-traitement**
  RAWX + SFRBX activés, NAV-PVT 1 Hz, horodatage **PPS→ISR** précis, profil F9P injecté au boot.
* **Enregistrement robuste**
  Fichiers `.ubx` **segmentés** (10–50 MB), **SHA-256 streaming**, **sidecar JSON** (campagne, dates, segments, empreintes), **journal de reprise** anti-coupure.
* **Gestion de campagne**
  Démarrage **instant** avec durée/cleanup, ou **campagnes planifiées** (period/duration), `campaignId` **source de vérité = backend**.
* **Transfert fiable**
  Handover **BLE → SoftAP** (break-before-make), **SoftAP éphémère** (SSID/pass/token aléatoires, TTL), **reprise d’upload** (offset) et **cleanup** côté device après confirmation.
* **Provisioning réseau**
  **BLE “prov”** pour SSID/mot de passe, statut `OK/FAIL`; paramétrage runtime (durées, TTL, politique cleanup).
* **Anti-blocage intégré**
  **INT WDT + TASK WDT** (panic→reboot), **health-monitor** (reset sous-systèmes puis `esp_restart()` après 3 échecs), **safe-mode** après 3 resets anormaux, **brown-out** activé. *(Option : watchdog matériel sur RESET.)*
* **Énergie & longévité**
  **Load-switch GNSS** hors session, **light-sleep** ESP, mesure batterie, seuils d’arrêt propre.
* **Sécurité sérieuse**
  **Secure Boot + chiffrement flash**, **OTA signé** + rollback, **rate-limit** HTTP SoftAP, `X-TRB-Token` court, NVS chiffré pour secrets.
* **Diagnostics opérateur**
  LED tri-couleur par état FSM, **logs structurés** (buffer circulaire exportables via SoftAP), auto-test µSD/FS, **statut GNSS** (fix, C/N₀) exposé.
* **Compat “modes”**
  **Rover** par défaut ; **Base** locale optionnelle (profil F9P alternatif) sans changer les APIs.
 
B. Côté app opérateur (mobile)

* **Orchestrateur** BLE→SoftAP→upload avec **reprise**, **timeout** par phase, et **fallback BLE-only** (iOS capricieux).
* **Cache serveur** (React Query) + **stores domaine** (Zustand) pour état BLE/transfer/job.
* **Panneau debug** lisant le buffer logs du device, KPIs par phase, export zip (sidecar+logs).



Rappel structure “prod” (condensé):

* **Matériel** : rails séparés (5 V GNSS / 3,3 V ESP), TVS/ESD/polyfuse, antenne L1/L2 éloignée du 2,4 GHz, UART1 @ **460 800**, PPS→GPIO ISR, µSD SPI, bouton service (SoftAP forcé).
* **Firmware** : tâches dédiées (UART DMA, writer segmenté, BLE, SoftAP HTTP, uploader, power/OTA/diag), **bus d’événements**, **FSM**
  `IDLE → ARMING → LOGGING → HANDOVER → TRANSFER → CLEANUP → IDLE`.
* **Protocole** :

  * **BLE** `prov` (Wi-Fi) + `a100` (instant/add\_campaign/delete\_files).
  * **Notify “files”** avec `ssid/serverUrl/password/proto/fw` pour handover.
  * **HTTP SoftAP** : `GET /api/files`, `GET /api/file`, `POST /api/cleanup` (token + TTL + rate-limit).
* **Anti-blocage** : WDTs, health-monitor (reset sous-systèmes → reboot escaladé), safe-mode après 3 resets, brown-out, (option watchdog matériel).

---

KPIs/acceptation (extraits, mesurables) :

* **0 fifo\_drops** sur **2 h** @ 460 800 bauds.
* **50 handovers** consécutifs sans deadlock ; **reconnect BLE < 5 s**.
* **Power-fail** en écriture → fichier récupérable, **SHA-256 OK**.
* **SoftAP** : TTL et extinction auto respectés, token expiré.
* **Anti-blocage** : 3 échecs health-monitor ⇒ **reboot** ; 3 resets anormaux ⇒ **safe-mode**.
* **Sécurité** : **Secure Boot + OTA signé** vérifiés (rollback OK).
* **GNSS** : C/N₀ stable malgré Wi-Fi proche (tolérance définie), sidecar complet.

---

 Dossier firmware (ajout “anti-blocage”):

```
main/
  app_main.c
  config.h
  event_bus.c/.h
  orchestrator/state_machine.c/.h
  gnss/        gnss_uart.c/.h   f9p_cfg.c/.h
  storage/     seg_writer.c/.h  journal.c/.h  sha256_stream.c/.h
  comm/        ble_srv.c/.h     softap_http.c/.h
  power/       power_ctrl.c/.h
  ota/         ota_secure.c/.h
  safety/      anti_block.c/.h   // WDT init, health-monitor, safe-mode
  diag/        logger.c/.h       selftest.c/.h
```



#### trackbee_iot - Note :

L'autonomie et l'economie d'energie sont une composante importante, il doit pouvoir se mettre en veille pendant les phases d'attente, seul le ble doit rester en etat de fonctionnement si une connection est initiée.
La regle principale du code est que l'esp doit pouvoir rebooter si un evenement le mets en default et retrouver sa mission.
Ces principales taches sont :
- NVS : il est capable d'enregister en memoire non volatile sa mission (campaignId en cours , le programme d'enregistrement,...) . A chaque redemarrage, il doit ecouter le gps afin de remettre a jour son horloge (recaler si necessaire) 
- Enregistrer des donnees dans un fichier provenant de la carte simplertk2B avec le bon nom qui se compose ainsi : '{campaignId}_{jour/mois/annee}_{heure/minute}.ubx'
- Liaison BLE avec l'app afin de transmettre des infos , transmettre un ssid+password si une demande de telechargement est demandée, 


Note a restructurer : 
- attention au buffer du debug/ des ordres
- Format des donnees reçue par l'app (base64,...)
- Le GPIO 22 correpsond au TX (liaison UART de la carte simplertk2B)
- Le GPIO 20 correpsond au RX (liaison UART de la carte simplertk2B)
- Le GPIO 18  permet de mettre sous tension  la carte simplertk2B


* Liste des erreurs deja rencontrée :

1. **`ble_send_status` type mismatch**

  * Déclaration `void ble_send_status(...)` dans `ble_manager.h` mais implémentation en `bool` → erreur de build.
  * Symptôme : *conflicting types for 'ble\_send\_status'*.

2. **`conn` / `om` non déclarés**

  * Code de notif `ble_gatts_notify_custom(conn, g_work_notify_handle, om)` utilisé hors contexte.
  * Symptôme : `error: 'conn' undeclared here (not in a function)`.

3. **Crash `assert failed: ble_hs_event_start_stage2 ble_hs.c:597 (rc == 0)`**

  * Arrivait lors du démarrage de NimBLE avec UUID 128 bits personnalisés → problème d’enregistrement ou mauvais format d’UUID.

4. **Pas de `nofix` dans le JSON reçu**

  * Le firmware n’envoyait jamais `nofix`, ou bien la valeur côté front n’était pas castée en bool (`!!cleanup` OK, mais `nofix: import.meta.env.VITE_NOFIX` donnait une string).
  * Symptôme : côté ESP, champ manquant.

5. **NOTIFY non reçu côté front**

  * L’ESP logge `=== NOTIFY JSON - OK ===`, mais l’app ne voit rien.
  * Cause : write exécuté avant que la notif A102 ne soit bien abonnée.

6. **Timeout `a100ProbeFiles` (2000 ms)**

  * L’ESP reçoit la commande `get_files`, mais la réponse arrive après que le front ait déjà coupé (2 s trop court).
  * Symptôme : `[BLE-A100] TIMEOUT after 2000ms`.


7. **`esp_http_server.h: No such file or directory`**

  * Tentative d’utiliser l’API HTTP Server sans l’avoir activée dans `idf.py menuconfig` (composant manquant).

8. **Connexion SoftAP qui échoue si un Wi-Fi existant est déjà associé**

  * Sur Android, l’OS “préférait” rester sur un Wi-Fi avec Internet au lieu de router le trafic vers `192.168.4.1`.
  * Symptôme : transferts cassés.
  * Fix : binding réseau forcé ou `NEHotspotConfiguration` sur iOS.

9. **HTTPS chunked encoding non géré**

  * Le code ne lisait pas les réponses “en morceaux” → résultat tronqué.
  * Fix : passage par `_http_event_handler`.


#### trackbee_iot - Scenario type : 

Scenario classique "mise en route" :
Il demarre, le boot initie quelque operations :
- le BLE en fonctionnement
- Si credentials wifi en nvs , il tente une connexion wifi , il remet son horloge en UTC si connexion, il contacte le serveur (prevoir : variable systeme "server_aadress") afin de se mettre a jour (ordres, fichiers, ...)
- Si pas de wifi , il ecoute un instant le GPS afin de remettre son horloge a l'UTC. (ouverture du gpio permettant l'allumage de la carte simplertk2B attente de signal sur les gpio RX/TX), lit le premier message UBX-NAV-TIMEUTC ou UBX-NAV-PVT, remet a jour son utc et coupe l'alimentation de la carte simplertk2b
- Il verifie en nvs si une surveyCampaign est en cours, si oui, verifie si le campaignId est là, si oui , verifie le type de mission ('STATIC_UNIQUE, STATIC_MULTIPLE,..), se met en mode mission et programme son reveil si besoin.
- Si pas de surveyCampaign, il mets tout en pause (sleep-mode ) sauf le BLE et attends une connexion

Un client se connecte par l'app en ble : 
- l'iot envoie les services disponibles
- reponds aux ordres de l'app

- s'il recoit une mission, il stocke en memoire nvs les donnees de façon a se reveiller a la bonne heure (-5minutes le temps que le GPS s'initie), mets sous tension la carte simplertk2B afin de verifier si le signal est 'FIX'. si pas de signal 'FIX', il previent l'utilisateur. sinon , il envoie un message de bonne reception et suivant la mission se met en veille ou commence la mission d'ecoute.
- L'horloge interne doit reveiller, l'esp si besoin , mets la carte gnss sous tension , attends le signal 'fix' , enregistre dans un fichier durant  le temps prévu.
- Les fichiers sont stockés dans une carte SD branché a l'esp
un client se connect en BLE, une demande de recherche des fichiers disponibles parvient a l'esp, l'esp reponds par le nombre de fichiers disponible, l'app luid demandera des credentials pour connexion softAP, il reponds , ble coupés par l'app ,une connexion wifi est lancé, le telechargement des fichiers se realise, a chaque fin de fichiers, l'app autorise la suppression du fichier et passe au suivant.
Si la mission est terminée, l'iot se met en sleep-mode et attends une prochaine connexion en ble.




# GLossaire

A venir.


