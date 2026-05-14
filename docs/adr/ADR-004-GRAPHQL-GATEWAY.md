# ADR 004 : API Gateway via Apollo GraphQL

**Date** : 2026-05-14
**Statut** : Accepté

## Contexte
Avec une architecture microservices, le frontend doit interagir avec plusieurs services (Véhicules, Conducteurs, Localisation). Faire plusieurs requêtes HTTP depuis le navigateur est inefficace (latence) et complexe (gestion de plusieurs URLs et authentifications).

## Décision
Mise en place d'une **API Gateway** unique utilisant **Apollo GraphQL**.

## Conséquences
### Points Positifs (+)
- **Requête unique** : Le frontend peut récupérer toutes les informations d'un dashboard (véhicule + conducteur + dernières alertes) en un seul appel GraphQL.
- **Découplage** : Le frontend ne connaît que la Gateway. Les changements d'URLs internes des microservices sont transparents.
- **Typage fort** : Le schéma GraphQL sert de contrat entre le backend et le frontend.
- **Agrégation** : Facilite la fusion de données provenant de sources différentes (SQL, gRPC).

### Points Négatifs (-)
- **Point de défaillance unique** : Si la Gateway tombe, toute l'application est indisponible.
- **Surcharge** : Ajoute une couche supplémentaire de traitement (parsing GraphQL).
