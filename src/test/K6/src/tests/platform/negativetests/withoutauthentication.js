/* 
  This test requires an user name and password and an app
  command to run the test: docker-compose run k6 run /src/tests/platform/negativetests/withoutauthentication.js 
  -e env=*** -e org=*** -e level2app=*** -e username=*** -e userpwd=*** -e appsaccesskey=***
*/

import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as profile from '../../../api/platform/profile.js';
import * as authz from '../../../api/platform/authorization.js';
import * as register from '../../../api/platform/register.js';
import * as instances from '../../../api/platform/storage/instances.js';
import * as sbl from '../../../api/platform/storage/messageboxinstances.js';
import * as events from '../../../api/platform/events/events.js';
import * as setUpData from '../../../setup.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;
let policyFile = open('../../../data/policy.xml', 'b');
let instanceJson = open('../../../data/instance.json');

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup data and return userData
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  setUpData.clearCookies();
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  var instanceId = instances.postInstance(altinnStudioRuntimeCookie, data['partyId'], appOwner, level2App, instanceJson);
  instanceId = instances.findInstanceId(instanceId.body);
  data.instanceId = instanceId;
  return data;
}

//Negative tests towards to platform apis without authentication and expect the response code to be 401
export default function (data) {
  const partyId = data['partyId'];
  const userId = data['userId'];
  const instanceId = data['instanceId'];
  var res, success;

  //Test to fetch userprofile by userid
  res = profile.getProfile(userId, null);
  success = check(res, {
    'GET Profile status is 401': (r) => r.status === 401,
  });
  addErrorCount(success);

  //Test Platform: Authorization: verify response is 401 without authentication
  res = authz.postPolicy(policyFile, appOwner, level2App, null);
  success = check(res, {
    'POST Policy Status is 401': (r) => r.status === 401,
  });
  addErrorCount(success);

  //Test Platform: Register: Get parties by partyId without authentication and validate response to have 401
  res = register.getParty(null, partyId);
  success = check(res, {
    'GET Party info - status is 401': (r) => r.status === 401,
  });
  addErrorCount(success);

  //Test to create an instance with storage api without authentication and validate the response to have 401
  res = instances.postInstance(null, partyId, appOwner, level2App, instanceJson);
  success = check(res, {
    'POST Create Instance status is 401': (r) => r.status === 401,
  });
  addErrorCount(success);

  //Test to get an instance by id from storage: SBL without authentication and validate the response code to have 401
  res = sbl.getSblInstanceById(null, partyId, instanceId);
  success = check(res, {
    'GET SBL Instance by Id status is 401': (r) => r.status === 401,
  });
  addErrorCount(success);

  //Test to get Events by party  without authentication and validate the response code to have 401
  res = events.getEventsByparty(null, null);
  success = check(res, {
    'GET Events by party status is 401': (r) => r.status === 401,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformNegativeWithoutAuthN')] = generateJUnitXML(data, 'platform-negative-withoutauthn');
  return result;
}
