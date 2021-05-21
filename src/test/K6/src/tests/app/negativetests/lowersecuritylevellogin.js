/* 
  This test requires an user credentials with level 2 or lower login and an app available only for users with login level 3 and above
  command to run the test: docker-compose run k6 run /src/tests/app/negativetests/lowersecuritylevellogin.js 
  -e env=*** -e org=*** -e level3app=*** -e username=*** -e userpwd=***
*/

import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as appInstances from '../../../api/app/instances.js';
import * as setUpData from '../../../setup.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level3App = __ENV.level3app;

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
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level3App);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  setUpData.clearCookies();
  return data;
}

//Negative tests towards to app apis with lower security level login
export default function (data) {
  const partyId = data['partyId'];
  const runtimeToken = data['RuntimeToken'];
  var res, success;

  //Test to create an instance without required security level login and expecting 403
  res = appInstances.postInstance(runtimeToken, partyId, appOwner, level3App);
  success = check(res, {
    'App POST Create Instance status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('negativeLowerlevelLogin')] = generateJUnitXML(data, 'app-negativeLowerlevelLogin');
  return result;
}
