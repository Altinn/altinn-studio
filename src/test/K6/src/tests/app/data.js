/* 
  Test data required: username, password, app requiring level 2 login (reference app: ttd/apps-test)
  command to run the test: docker-compose run k6 run /src/tests/app/data.js 
  -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** -e sblaccesskey=***
*/

import { check } from 'k6';
import { addErrorCount } from '../../errorcounter.js';
import * as appInstances from '../../api/app/instances.js';
import * as appData from '../../api/app/data.js';
import * as platformInstances from '../../api/platform/storage/instances.js';
import * as apps from '../../api/platform/storage/applications.js';
import { deleteSblInstance } from '../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../setup.js';
import { generateJUnitXML, reportPath } from '../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;
let instanceFormDataXml = open('../../data/' + level2App + '.xml');
let pdfAttachment = open('../../data/test_file_pdf.pdf', 'b');

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
};

//Function to setup data and return AltinnstudioRuntime Token
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  setUpData.clearCookies();
  var attachmentDataType = apps.getAppByName(altinnStudioRuntimeCookie, appOwner, level2App);
  attachmentDataType = apps.findAttachmentDataType(attachmentDataType.body);
  data.attachmentDataType = attachmentDataType;
  var instanceId = appInstances.postInstance(altinnStudioRuntimeCookie, data['partyId'], appOwner, level2App);
  var dataId = appData.findDataId(instanceId.body);
  instanceId = platformInstances.findInstanceId(instanceId.body);
  data.instanceId = instanceId;
  data.dataId = dataId;
  return data;
}

//Tests for App API: Data
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  const attachmentDataType = data['attachmentDataType'];
  var instanceId = data['instanceId'];
  var dataId = data['dataId'];

  //Test to Get instance data by id with App api and validate the response
  var res = appData.getDataById(runtimeToken, partyId, instanceId, dataId, appOwner, level2App);
  var success = check(res, {
    'App GET Data by Id status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Test to edit a form data in an instance with App APi and validate the response
  res = appData.putDataById(runtimeToken, partyId, instanceId, dataId, null, instanceFormDataXml, appOwner, level2App);
  success = check(res, {
    'PUT Edit Data by Id status is 201': (r) => r.status === 201,
  });
  addErrorCount(success);

  //Test to delete a form data in an instance with App API and validate the response
  res = appData.deleteDataById(runtimeToken, partyId, instanceId, dataId, appOwner, level2App);
  success = check(res, {
    'DELETE Form Data by Id Not Allowed status is 400': (r) => r.status === 400,
  });
  addErrorCount(success);

  //Test to upload an attachment to an instance with App API and validate the response
  res = appData.postData(runtimeToken, partyId, instanceId, attachmentDataType, pdfAttachment, 'pdf', appOwner, level2App);
  success = check(res, {
    'POST Attachment is uploaded status is 201': (r) => r.status === 201,
  });
  addErrorCount(success);

  dataId = JSON.parse(res.body).id;

  //Test to delete a an attachment from an instance with App API and validate the response
  res = appData.deleteDataById(runtimeToken, partyId, instanceId, dataId, appOwner, level2App);
  success = check(res, {
    'DELETE Attachment Allowed status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);
}

//Delete the instance created
export function teardown(data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  const instanceId = data['instanceId'];

  deleteSblInstance(runtimeToken, partyId, instanceId, 'true');
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('appData')] = generateJUnitXML(data, 'app-data');
  return result;
}
