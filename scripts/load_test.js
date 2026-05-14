import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp-up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },  // Ramp-down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be below 1%
  },
};

const BASE_URL = 'http://localhost:4000/graphql'; // Assuming Gateway is at 4000

export default function () {
  // Simulate a driver getting their alerts
  const query = `
    query {
      alertes {
        id
        message
        niveau
      }
    }
  `;

  const res = http.post(BASE_URL, JSON.stringify({ query }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'is status 200': (r) => r.status === 200,
    'has data': (r) => r.json().data !== undefined,
  });

  sleep(1);
}
