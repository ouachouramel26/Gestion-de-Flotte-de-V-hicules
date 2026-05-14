const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');

console.log('[OTel] Initializing simplified SDK for Gateway...');

const sdk = new NodeSDK({
  serviceName: 'api-gateway', // Syntaxe simplifiée compatible avec toutes les versions
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

try {
  sdk.start();
  console.log('[OTel] SDK started successfully');
} catch (error) {
  console.error('[OTel] Error starting SDK:', error);
}

process.on('SIGTERM', () => {
  sdk.shutdown()
    .finally(() => process.exit(0));
});
