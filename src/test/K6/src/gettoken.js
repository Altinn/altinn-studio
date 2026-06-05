import * as setUpData from './setup.js';

export const options = {
  thresholds: {
    checks: ['rate==1.0'],
  },
};

export default function () {
  const runtimeToken = setUpData.getAltinnTokenForUser();
  // Sets environment variable in Azure DevOps pipeline.
  console.log(`##vso[task.setvariable variable=runtimetoken;issecret=true]${runtimeToken}`);
}
