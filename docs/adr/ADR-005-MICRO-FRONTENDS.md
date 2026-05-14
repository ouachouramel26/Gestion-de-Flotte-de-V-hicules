# ADR 005 : Architecture Micro-Frontends avec Module Federation

**Date** : 2026-05-14
**Statut** : Accepté

## Contexte
L'interface utilisateur devient complexe, notamment avec l'intégration d'une carte interactive lourde (Leaflet). Nous voulons éviter qu'un changement sur la carte nécessite de re-déployer tout le dashboard, et permettre à différentes équipes de travailler sur des modules distincts.

## Décision
Adoption du pattern **Micro-Frontends** via **Module Federation** (Vite/Webpack).

## Conséquences
### Points Positifs (+)
- **Déploiement Indépendant** : On peut mettre à jour le module `mf-carte` sans toucher au `mf-shell`.
- **Isolation des stacks** : Chaque micro-frontend peut techniquement utiliser ses propres versions de librairies.
- **Lazy Loading natif** : Le code de la carte n'est chargé que lorsque l'utilisateur accède à l'onglet "Localisation".

### Points Négatifs (-)
- **Complexité de configuration** : La mise en place du partage de dépendances (React, Apollo) est délicate.
- **Expérience Dev** : Nécessite de lancer plusieurs serveurs de développement en local.
- **Partage du State** : Le partage de l'authentification (Keycloak) et du cache GraphQL entre modules demande une attention particulière.
