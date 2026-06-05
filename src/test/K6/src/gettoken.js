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
  const success = check(runtimeToken, {
    'Acquired token is a JWT': (t) => typeof t === 'string' && t.split('.').length === 3,
  });
  if (success) {
    // Sets environment variable in Azure DevOps pipeline.
    console.log(`##vso[task.setvariable variable=runtimetoken;issecret=true]${runtimeToken}`);
  }
}
