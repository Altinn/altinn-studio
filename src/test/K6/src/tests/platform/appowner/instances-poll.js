/* 
    Pre-reqisite for test: 
    1. MaskinPorteTokenGenerator https://github.com/Altinn/MaskinportenTokenGenerator built
    2. Installed appOwner certificate
    3. Send maskinporten token as environment variable: -e maskinporten=token

    Environment variables for test environments: 
    -e tokengenuser=*** -e tokengenuserpwd=*** -e scopes=altinn:serviceowner/instances.read

    This test script is to poll towards get instances every x seconds (sent using env variable poll)
    as an app owner
    
    Test data required: an app that has instances in task 1 and maskinporten token for appowner
    Command: docker-compose run k6 run --duration 10m /src/tests/platform/appowner/instances-poll.js 
    -e env=*** -e org=*** -e app=*** -e maskinporten=token -e poll=60 (in seconds)
*/

import { check, sleep } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as instances from '../../../api/platform/storage/instances.js';

const appOwner = __ENV.org;
const appName = __ENV.app;
const pollEvery = __ENV.poll;

export const options = {
  vus: 1,
  thresholds: {
    errors: ['count<1'],
  },
};

export function setup() {
  var data = {};
  var altinnStudioRuntimeCookie = setUpData.getAltinnTokenForTTD();
  data.RuntimeToken = altinnStudioRuntimeCookie;
  return data;
}

export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  var res, success;

  //Get app instances of appName that are in task1
  var filters = {
    appId: appOwner + '/' + appName,
    'process.currentTask': 'Task_1',
  };
  res = instances.getAllinstancesWithFilters(runtimeToken, filters);
  success = check(res, {
    'GET Instance by Current task is 200': (r) => r.status === 200,
    'Instance current task is task_1': (r) => JSON.parse(r.body).instances[0].process.currentTask.elementId === 'Task_1',
  });
  addErrorCount(success);

  sleep(pollEvery);
}
