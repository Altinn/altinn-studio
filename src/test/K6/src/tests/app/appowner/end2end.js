/* 
  Pre-reqisite for test towards prod:
  1. MaskinPorteTokenGenerator https://github.com/Altinn/MaskinportenTokenGenerator built
  2. Installed appOwner certificate
  3. Send maskinporten token as environment variable: -e maskinporten=token

  Environment variables for test environments: 
  -e tokengenuser=*** -e tokengenuserpwd=*** -e scopes=altinn:serviceowner/instances.read

  This test script is end to end test of an app using app api for app owner where data upload is by user
  Test data required: username and password, deployed app with two tasks that requires level 2 login 
  (reference app: ttd/two-task-app) to find the party id of the user to create an instance
  and maskinporten token
  
  Command: docker-compose run k6 run /src/tests/app/appowner/instances.js 
  -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** 
*/

import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as appInstances from '../../../api/app/instances.js';
import * as appData from '../../../api/app/data.js';
import * as appProcess from '../../../api/app/process.js';
import * as apps from '../../../api/platform/storage/applications.js';
import * as storageInstances from '../../../api/platform/storage/instances.js';
import * as setUpData from '../../../setup.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;

let instanceFormDataXml = open('../../../data/' + level2App + '.xml');
let pdfAttachment = open('../../../data/test_file_pdf.pdf', 'b');

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup data and return AltinnstudioRuntime Token
export function setup() {
  //authenticate end user to find party info
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  setUpData.clearCookies();
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
  data.userRuntimeToken = altinnStudioRuntimeCookie; //send user token to use in updating instance data

  //get token for appowner: ttd
  altinnStudioRuntimeCookie = setUpData.getAltinnTokenForTTD();
  data.orgRuntimeToken = altinnStudioRuntimeCookie;
  var attachmentDataType = apps.getAppByName(altinnStudioRuntimeCookie, appOwner, level2App);
  attachmentDataType = apps.findAttachmentDataType(attachmentDataType.body);
  data.attachmentDataType = attachmentDataType;
  return data;
}

//End 2 end test of app api for an app with attachment component as an appowner
export default function (data) {
  const orgRuntimeToken = data['orgRuntimeToken'];
  const userRuntimeToken = data['userRuntimeToken'];
  const partyId = data['partyId'];
  const attachmentDataType = data['attachmentDataType'];
  var instanceId = '';
  var dataId = '';
  var res, success;

  //Test to create an instance with storage api and validate the response that created by is an app owner
  res = appInstances.postInstance(orgRuntimeToken, partyId, appOwner, level2App);
  success = check(res, {
    'POST Create Instance status is 201': (r) => r.status === 201,
    'POST Create Instance Instance Id is not null': (r) => JSON.parse(r.body).id != null,
  });
  addErrorCount(success);

  if (JSON.parse(res.body).id != null) {
    instanceId = storageInstances.findInstanceId(res.body);
    dataId = appData.findDataId(res.body);
  }

  //Test to get an instance by id from storage and validate the response
  res = appInstances.getInstanceById(orgRuntimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'GET Instance by Id status is 200': (r) => r.status === 200,
    'CreatedBy of Instance is app owner': (r) => JSON.parse(r.body).createdBy.toString().length === 9,
  });
  addErrorCount(success);

  //Test to update the sub status of an instance and validate the response
  res = appInstances.putUpdateSubStatus(orgRuntimeToken, partyId, instanceId, appOwner, level2App, 'test', 'test description');
  success = check(res, {
    'PUT Update sub status is 200': (r) => r.status === 200,
    'Instance sub status is updated': (r) => JSON.parse(r.body).status.substatus != null,
  });
  addErrorCount(success);

  //Test to edit a form data in an instance with App APi and validate the response
  res = appData.putDataById(userRuntimeToken, partyId, instanceId, dataId, 'default', instanceFormDataXml, appOwner, level2App);
  success = check(res, {
    'PUT Edit Data by Id status is 201': (r) => r.status === 201,
  });
  addErrorCount(success);

  //upload a valid attachment to an instance with App API
  res = appData.postData(orgRuntimeToken, partyId, instanceId, attachmentDataType, pdfAttachment, appOwner, level2App);
  success = check(res, {
    'POST Upload attachment status is 201': (r) => r.status === 201,
  });
  addErrorCount(success);

  //Test to get validate instance and verify that validation of instance is ok
  res = appInstances.getValidateInstance(userRuntimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'App GET Validate Instance validation OK': (r) => JSON.parse(r.body).length === 0,
  });
  addErrorCount(success);

  //Test to get next process of an app instance again and verify response code  to be 200
  res = appProcess.getNextProcess(userRuntimeToken, partyId, instanceId, appOwner, level2App);

  var nextElement = JSON.parse(res.body)[0];

  //Test to move the process of an app instance to the next process element and verify response code to be 200
  res = appProcess.putNextProcess(userRuntimeToken, partyId, instanceId, nextElement, appOwner, level2App);
  success = check(res, {
    'App PUT Move process to Next element status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Test to get next process of an app instance again and verify response code  to be 200
  res = appProcess.getNextProcess(orgRuntimeToken, partyId, instanceId, appOwner, level2App);

  nextElement = JSON.parse(res.body)[0];

  //Test to move the process of an app instance to the next process element and verify response code to be 200
  res = appProcess.putNextProcess(orgRuntimeToken, partyId, instanceId, nextElement, appOwner, level2App);
  success = check(res, {
    'App PUT Move process to Next element status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Test to mark an instance as complete confirmed and validate the response
  res = appInstances.postCompleteConfirmation(orgRuntimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'POST Complete instance is 200': (r) => r.status === 200,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('appownerE2E')] = generateJUnitXML(data, 'app-appownerE2E');
  return result;
}
