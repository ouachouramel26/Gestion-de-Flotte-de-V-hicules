const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'service-localisation',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const producer = kafka.producer();

const connectProducer = async () => {
  await producer.connect();
  console.log('Kafka Producer (Localisation) connecté');
};

const sendGeofenceAlert = async (vehiculeId, typeZone, message) => {
  try {
    await producer.send({
      topic: 'localisation-events', // Utilisé par service-alertes pour les alertes géofence
      messages: [
        {
          value: JSON.stringify({
            eventType: 'SORTIE_ZONE',
            vehiculeId,
            statut: typeZone === 'INTERDITE' ? 'ALERTE' : 'INFO',
            timestamp: new Date().toISOString(),
            message
          })
        },
      ],
    });
  } catch (err) {
    console.error('Erreur envoi alerte Geofence:', err);
  }
};

module.exports = { connectProducer, sendGeofenceAlert };
