# ADR 001 : Utilisation d'Apache Kafka pour la communication asynchrone

## Statut
Accepté

## Contexte
Dans une architecture microservices, la communication entre services peut devenir complexe et fragile si elle est purement synchrone (REST/HTTP). Si un service tombe, toute la chaîne peut s'arrêter.

## Décision
Nous avons choisi d'utiliser **Apache Kafka** comme bus d'événements central pour gérer les interactions asynchrones entre les services (notamment Véhicules → Maintenance, et Véhicules → Alertes).

## Conséquences
- **Découpage fort** : Le Service Véhicules ne connaît pas l'existence du Service Maintenance. Il publie un message, et n'importe quel service intéressé peut s'y abonner.
- **Résilience** : Si le Service Maintenance est éteint, Kafka stocke les messages. À son redémarrage, le service traitera les données en attente.
- **Saga Pattern** : Permet de garantir la cohérence finale des données à travers le cluster sans transactions distribuées lourdes.
