# ADR 003 : Utilisation de TimescaleDB pour la localisation

**Date** : 2026-05-14
**Statut** : Accepté

## Contexte
Le système doit suivre en temps réel des centaines de véhicules, générant des milliers de points GPS par minute. Une base de données relationnelle classique (PostgreSQL standard) pourrait rencontrer des problèmes de performance lors de l'insertion massive et de la requête sur de grands historiques (index qui saturent la RAM).

## Décision
Nous avons choisi d'utiliser **TimescaleDB**, une extension de PostgreSQL optimisée pour les séries temporelles.

## Conséquences
### Points Positifs (+)
- **Performance d'écriture** : Les "Hypertables" partitionnent les données automatiquement, garantissant des performances d'insertion constantes.
- **Requêtes temporelles** : Fonctions intégrées pour l'agrégation par temps (`time_bucket`).
- **Écosystème** : Compatibilité totale avec les outils PostgreSQL existants (DBeaver, TypeORM, Prisma).
- **Compression** : Jusqu'à 90% de réduction d'espace disque pour les données froides.

### Points Négatifs (-)
- **Complexité** : Nécessite la gestion de l'extension Timescale sur l'image Docker Postgres.
- **Apprentissage** : Quelques concepts spécifiques (Hypertables, Chunking) à maîtriser.
