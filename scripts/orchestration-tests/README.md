# Orchestration Test Suite

Ce dossier regroupe les scripts automatisés dédiés à la vérification de l’orchestration (hydratation des données, normalisation des bundles, interactions BLE, etc.).

## Contenu

| Fichier | Rôle |
| --- | --- |
| `map-hydration.test.ts` | Vérifie la normalisation `HydrateData → DeviceBundle`. |
| `use-device-scan.test.ts` | Valide le hook `useDeviceScan` (retours BLE, erreurs). |
| `use-geocoding.test.ts` | Vérifie les mutations `geocodeAddress` / `reverseGeocode` avec React Query. |
| `README.md` | Ce guide. |

## Exécution rapide

```bash
npm run test:orchestration
```

Cette commande déclenche les scénarios Vitest présents dans `scripts/orchestration-tests/`.

## Ajouter de nouveaux scénarios

1. Créez un fichier `*.test.ts` dans ce dossier.
2. Utilisez Vitest (`describe`, `it`, `expect`) et, si besoin, moquez les services via `vi.mock`.
3. Ajoutez une courte note dans ce README si le test couvre un nouveau pan fonctionnel.

## Commandes utiles

| Commande | Description |
| --- | --- |
| `npm run test:orchestration` | Exécute exclusivement les tests d’orchestration. |
| `npm run test` | Exécute l’ensemble des tests Vitest du projet (orchestration incluse). |

> Les scripts sont pensés pour s’intégrer facilement dans un pipeline CI/CD, sans interaction humaine ni page web.
