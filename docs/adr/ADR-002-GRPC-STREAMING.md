# ADR 002 : Utilisation de gRPC pour le streaming de localisation

## Statut
Accepté

## Contexte
Le tracking GPS nécessite la transmission de milliers de points de position par seconde. L'utilisation de REST (JSON sur HTTP) est trop verbeuse et consomme trop de bande passante et de CPU à cause de la sérialisation/désérialisation.

## Décision
Le **Service Localisation** utilise **gRPC** (HTTP/2 + Protocol Buffers) pour le streaming des positions des véhicules.

## Conséquences
- **Performance** : Format binaire ultra-compact réduisant la latence.
- **Bi-directionnalité** : Permet au serveur de pousser des mises à jour aux clients en temps réel (Streaming).
- **Contrat Fort** : Le fichier `.proto` sert de documentation vivante et génère automatiquement le code pour le client et le serveur, garantissant la cohérence des types.
