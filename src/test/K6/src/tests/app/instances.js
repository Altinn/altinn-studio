/* 
  Test data required: username, password, app requiring level 2 login (reference app: ttd/apps-test)
  command to run the test: docker-compose run k6 run /src/tests/app/instances.js 
  -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** -e sblaccesskey=***
*/

import { check } from 'k6';
import { addErrorCount } from '../../errorcounter.js';
import * as appInstances from '../../api/app/instances.js';
import * as platformInstances from '../../api/platform/storage/instances.js';
import { deleteSblInstance } from '../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../setup.js';
import { generateJUnitXML, reportPath } from '../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup data and return AltinnstudioRuntime Token
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  return data;
}

//Tests for App Api: Instances
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  var instanceId = '';

  //Test to create an instance with App api and validate the response
  var res = appInstances.postInstance(runtimeToken, partyId, appOwner, level2App);
  var success = check(res, {
    'App POST Create Instance status is 201': (r) => r.status === 201,
    'App POST Create Instance Instace Id is not null': (r) => JSON.parse(r.body).id != null,
  });
  addErrorCount(success);
  var instanceJson = res.body;
  if (JSON.parse(instanceJson).id != null) {
    instanceId = platformInstances.findInstanceId(instanceJson);
  }

  //Test to get an instance by id with App api and validate the response
  res = appInstances.getInstanceById(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'App GET Instance by Id status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  deleteSblInstance(runtimeToken, partyId, instanceId, 'true');
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('appInstances')] = generateJUnitXML(data, 'app-Instances');
  return result;
}
