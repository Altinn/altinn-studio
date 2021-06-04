/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run /src/tests/platform/profile/profile.js 
    -e env=*** -e org=*** -e level2app=*** -e username=*** -e userpwd=*** -e appsaccesskey=***
*/
import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as profile from '../../../api/platform/profile.js';
import * as setUpData from '../../../setup.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

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

//Function to setup data and return userData
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  return altinnStudioRuntimeCookie;
}

//Test for platform profile and validate response
export default function (data) {
  const runtimeToken = data;

  var userData = setUpData.getUserData(runtimeToken, appOwner, level2App);
  const userId = userData['userId'];
  const ssn = userData['ssn'];
  var res, success;

  //Test to fetch userprofile by userid
  res = profile.getProfile(userId, runtimeToken);
  success = check(res, {
    'GET Profile status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);

  //Test to fetch userprofile by SSN
  res = profile.postFetchProfileBySSN(ssn, runtimeToken);
  success = check(res, {
    'POST Fetch profile by SSN is 403': (r) => r.status === 403,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformProfile')] = generateJUnitXML(data, 'platform-profile');
  return result;
}
