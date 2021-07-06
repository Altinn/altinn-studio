/* 
    Pre-reqisite for test: 
    1. MaskinPorteTokenGenerator https://github.com/Altinn/MaskinportenTokenGenerator built
    2. Installed appOwner certificate
    3. Send maskinporten token as environment variable: -e maskinporten=token

    Environment variables for test environments: 
    -e tokengenuser=*** -e tokengenuserpwd=*** -e scopes=altinn:serviceowner/instances.read

    This test script is a negative test where app owner should be forbidden to write to instance without write access
    Test data required: username and password, deployed app that requires level 2 login 
    (reference app: ttd/apps-test) to find the party id of the user and maskinporten token
    
    Command: docker-compose run k6 run /src/tests/app/negativetests/appowner-writewithoutaccess.js 
    -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** -e maskinporten=token
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
  data.userRuntimeToken = altinnStudioRuntimeCookie; //send user token to use in create instance

  //get token for appowner: ttd
  altinnStudioRuntimeCookie = setUpData.getAltinnTokenForTTD();
  data.RuntimeToken = altinnStudioRuntimeCookie;
  var attachmentDataType = apps.getAppByName(altinnStudioRuntimeCookie, appOwner, level2App);
  attachmentDataType = apps.findAttachmentDataType(attachmentDataType.body);
  data.attachmentDataType = attachmentDataType;
  return data;
}

//Negative test - app owner is forbidden to write to instance without write access
export default function (data) {
  const orgRuntimeToken = data['RuntimeToken'];
  const userRuntimeToken = data['userRuntimeToken'];
  const partyId = data['partyId'];
  const attachmentDataType = data['attachmentDataType'];
  var instanceId = '';
  var dataId = '';
  var res, success;

  //Test to create an instance with storage api and validate that the app owner is forbidden.
  res = appInstances.postInstance(orgRuntimeToken, partyId, appOwner, level2App);
  success = check(res, {
    'Create Instance as app owner without write access - status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);

  //Start an app instance using app api as the user
  res = appInstances.postInstance(userRuntimeToken, partyId, appOwner, level2App);

  if (JSON.parse(res.body).id != null) {
    instanceId = storageInstances.findInstanceId(res.body);
    dataId = appData.findDataId(res.body);
  }

  //Test to edit a form data in an instance with App APi and validate that the app owner is forbidden.
  res = appData.putDataById(orgRuntimeToken, partyId, instanceId, dataId, null, instanceFormDataXml, appOwner, level2App);
  success = check(res, {
    'Edit Form Data as app owner without write access - status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);

  //upload a valid attachment to an instance with App API and validate that the app owner is forbidden.
  res = appData.postData(orgRuntimeToken, partyId, instanceId, attachmentDataType, pdfAttachment, 'pdf', appOwner, level2App);
  success = check(res, {
    'Upload attachment as app owner without write access - status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);

  //Test to get next process of an app instance
  res = appProcess.getNextProcess(orgRuntimeToken, partyId, instanceId, appOwner, level2App);

  var nextElement = JSON.parse(res.body)[0];

  //Test to move the process of an app instance to the next process element and validate that the app owner is forbidden.
  res = appProcess.putNextProcess(orgRuntimeToken, partyId, instanceId, nextElement, appOwner, level2App);
  success = check(res, {
    'Move process to Next element as appowner without write access - status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('negativeWithoutAccess')] = generateJUnitXML(data, 'app-negativeWithoutAccess');
  return result;
}
