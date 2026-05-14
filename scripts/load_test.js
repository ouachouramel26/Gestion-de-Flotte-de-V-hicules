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

const BASE_URL = 'http://localhost:4000/health'; 

export default function () {
  const res = http.get(BASE_URL);

  check(res, {
    'is status 200': (r) => r.status === 200,
    'status is UP': (r) => r.json().status === 'UP',
  });

  sleep(1);
}
