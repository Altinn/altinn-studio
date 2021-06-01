/* 
  Test data required: A test app, username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
  Command: docker-compose run k6 run /src/tests/platform/storage/applications.js 
  -e env=*** -e org=*** -e username=*** -e userpwd=*** -e testapp=*** -e level2app=***
*/

import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as application from '../../../api/platform/storage/applications.js';
import * as setUpData from '../../../setup.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;
const testApp = __ENV.testapp;
let metadata = open('../../../data/appmetadata.json');

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

//Tests for platform Storage: Applications
export default function (data) {
  const runtimeToken = data;
  var res, success;

  //Test Platform: Storage: Get All applicaions under an appOwner
  res = application.getAllApplications(runtimeToken, appOwner);
  success = check(res, {
    'GET All Apps under an Org status is 200': (r) => r.status === 200,
    'GET All Apps under an Org List is not empty': (r) => JSON.parse(r.body).applications.length != 0,
  });
  addErrorCount(success);

  //Test Platform: Storage: Get application by app name and validate response
  res = application.getAppByName(runtimeToken, appOwner, level2App);
  var appId = appOwner + '/' + level2App;
  success = check(res, {
    'GET App by Name status is 200': (r) => r.status === 200,
    'GET App by Name Metadata is OK': (r) => JSON.parse(r.body).id === appId,
  });
  addErrorCount(success);

  //Test Platform: Storage: Post create an app with metadata
  //expected: 403 as it is not possible to create App with an user token
  res = application.postCreateApp(runtimeToken, appOwner, testApp, metadata);
  success = check(res, {
    'POST Create App status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);

  //Api call to Platform: Storage: PUT Edit an app metadata
  //expected: 403 as response code as it is not possible to create App with an user token
  res = application.putEditApp(runtimeToken, appOwner, testApp, metadata);
  success = check(res, {
    'PUT Edit App status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);

  //Api call to Platform: Storage: Delete an application
  //expected: 403 as response code as it is not possible to create App with an user token
  res = application.deleteAppByName(runtimeToken, appOwner, testApp, 'false');
  success = check(res, {
    'DELETE App status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformStorageApps')] = generateJUnitXML(data, 'platform-storage-apps');
  return result;
}
