/* 
    Test data required: username and password, an app (reference app: ttd/apps-test)
    Command: docker-compose run k6 run /src/tests/platform/storage/texts.js 
    -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=***
*/

import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as texts from '../../../api/platform/storage/texts.js';
import * as setUpData from '../../../setup.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;
const testApp = __ENV.testapp;

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
  return altinnStudioRuntimeCookie;
}

//Tests for platform Storage: Applications Texts
export default function (data) {
  const runtimeToken = data;
  var res, success;

  //Test Platform: Storage: Get  applicaions under an appOwner
  res = texts.getAppTexts(runtimeToken, appOwner, level2App, 'nb');
  success = check(res, {
    'GET App texts is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Test Platform: Storage: Post upload app texts
  //expected: 403 as it is not possible to upload app texts with an user token
  res = texts.postAppTexts(runtimeToken, appOwner, testApp, 'nb');
  success = check(res, {
    'POST Upload App Texts status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);

  //Api call to Platform: Storage: PUT Edit app texts
  //expected: 403 as response code
  res = texts.putEditAppTexts(runtimeToken, appOwner, testApp, 'nb');
  success = check(res, {
    'PUT Edit App Texts status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);

  //Api call to Platform: Storage: DELETE app texts
  //expected: 403 as response code
  res = texts.deleteAppTexts(runtimeToken, appOwner, testApp, 'nb');
  success = check(res, {
    'DELETE App Texts status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformStorageTexts')] = generateJUnitXML(data, 'platform-storage-texts');
  return result;
}
