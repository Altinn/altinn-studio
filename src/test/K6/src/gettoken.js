import { check } from 'k6';
import * as setUpData from './setup.js';

export const options = {
  thresholds: {
    checks: ['rate==1.0'],
  },
};

export default function () {
  let runtimeToken;
  try {
    runtimeToken = setUpData.getAltinnTokenForUser();
  } catch (e) {
    runtimeToken = null;
  }
  check(runtimeToken, {
    'Acquired token is a JWT': (t) => typeof t === 'string' && t.split('.').length === 3,
  });
  console.log(runtimeToken);
}
