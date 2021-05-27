/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run /src/tests/platform/receipt/receipt.js 
    -e env=*** -e org=*** -e level2app=*** -e username=*** -e userpwd=*** -e appsaccesskey=***
*/

import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as setUpData from '../../../setup.js';
import * as instances from '../../../api/platform/storage/instances.js';
import * as receipt from '../../../api/platform/receipt.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;
let instanceJson = open('../../../data/instance.json');

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup data and return AltinnstudioRuntime Token, instance and user details
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  setUpData.clearCookies();
  var instanceId = instances.postInstance(altinnStudioRuntimeCookie, data['partyId'], appOwner, level2App, instanceJson);
  instanceId = instances.findInstanceId(instanceId.body);
  data.instanceId = instanceId;
  return data;
}

//Test for platform receipt and validate response
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  const instanceId = data['instanceId'];
  var res, success;

  res = receipt.getReceipt(partyId, instanceId, runtimeToken);
  success = check(res, {
    'Get receipt Status is 200': (r) => r.status === 200,
    'Get receipt includes party info': (r) => JSON.parse(r.body).party.partyId == partyId,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformReceipt')] = generateJUnitXML(data, 'platform-receipt');
  return result;
}
