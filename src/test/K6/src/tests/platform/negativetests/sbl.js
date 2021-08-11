/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run /src/tests/platform/negativetests/sbl.js 
    -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** -e sblaccesskey=***
*/

import { check } from 'k6';
import * as instances from '../../../api/platform/storage/instances.js';
import * as appInstances from '../../../api/app/instances.js';
import * as sbl from '../../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../../setup.js';
import { addErrorCount } from '../../../errorcounter.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const appName = __ENV.level2app;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
};

//Function to setup data and return AltinnstudioRuntime Token, instance and user details
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, appName);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  setUpData.clearCookies();
  var instanceId = appInstances.postInstance(altinnStudioRuntimeCookie, data['partyId'], appOwner, appName);
  instanceId = instances.findInstanceId(instanceId.body);
  data.instanceId = instanceId;
  return data;
}

//Negative tests for platform Storage: MessageBoxInstances
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  const instanceId = data['instanceId'];
  var res, success;

  sbl.deleteSblInstance(runtimeToken, partyId, instanceId, 'true');

  //Test to restore a hard deleted instance from storage: SBL and validate the response to have 404
  res = sbl.restoreSblInstance(runtimeToken, partyId, instanceId);
  success = check(res, {
    'Restore Hard Deleted instance - status is 404': (r) => r.status === 404,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformNegativeSBL')] = generateJUnitXML(data, 'platform-negative-sbl');
  return result;
}
