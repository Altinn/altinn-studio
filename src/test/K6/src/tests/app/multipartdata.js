/* 
  This test is to create an instance with form data xml using multipart request body.
  Test data required: username, password, app requiring level 2 login (reference app: ttd/apps-test)
  command to run the test: docker-compose run k6 run /src/tests/app/multipartdata.js 
  -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** -e sblaccesskey=***
*/

import { check } from 'k6';
import { addErrorCount } from '../../errorcounter.js';
import * as appInstances from '../../api/app/instances.js';
import * as appData from '../../api/app/data.js';
import * as platformInstances from '../../api/platform/storage/instances.js';
import { deleteSblInstance } from '../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../setup.js';
import { generateJUnitXML, reportPath } from '../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const appName = __ENV.level2app;
let instanceFormDataXml = open('../../data/' + appName + '.xml');

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup data and return AltinnstudioRuntime Token and user data
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, appName);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  return data;
}

//Tests for App Api: Instances with multipart data
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  var instanceId = '';
  var res, success, dataId;

  //Test to create an instance with multipart data and verify that an instance is created
  res = appInstances.postInstanceWithMultipartData(runtimeToken, partyId, appOwner, appName, instanceFormDataXml);
  success = check(res, {
    'App POST Create Instance with Multipart data status is 201': (r) => r.status === 201,
    'App POST Create Instance with Multipart data Instace Id is not null': (r) => JSON.parse(r.body).id != null,
  });
  addErrorCount(success);

  instanceId = platformInstances.findInstanceId(res.body);
  dataId = appData.findDataId(res.body);

  //Test to Get instance data created by the multipart request with App api and validate the response code
  var res = appData.getDataById(runtimeToken, partyId, instanceId, dataId, appOwner, appName);
  var success = check(res, {
    'App Get Data created by Multipart request status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //hard delete instance
  deleteSblInstance(runtimeToken, partyId, instanceId, 'true');
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('multipartdata')] = generateJUnitXML(data, 'app-multipartdata');
  return result;
}
