/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run /src/tests/platform/storage/process.js 
    -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** -e sblaccesskey=***
*/

import { check } from 'k6';
import * as instances from '../../../api/platform/storage/instances.js';
import * as process from '../../../api/platform/storage/process.js';
import * as sbl from '../../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../../setup.js';
import { addErrorCount } from '../../../errorcounter.js';
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

//Tests for Platform: Storage: Process
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  const instanceId = data['instanceId'];
  var res, success;

  var instanceProcess = instances.getInstanceById(runtimeToken, partyId, instanceId);
  instanceProcess = JSON.parse(instanceProcess.body).process;

  //Test to edit the process of an instance and validate the response
  res = process.putProcess(runtimeToken, partyId, instanceId, instanceProcess);
  success = check(res, {
    'PUT Edit Process status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Test to get the process history of an instance and validate the response
  res = process.getProcessHistory(runtimeToken, partyId, instanceId);
  success = check(res, {
    'GET Process history status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);
}

export function teardown(data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  const instanceId = data['instanceId'];

  sbl.deleteSblInstance(runtimeToken, partyId, instanceId, 'true');
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformStorageProcess')] = generateJUnitXML(data, 'platform-storage-process');
  return result;
}
