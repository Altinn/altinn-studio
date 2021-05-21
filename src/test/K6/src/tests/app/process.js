/* 
  Test data required: username, password, app requiring level 2 login (reference app: ttd/apps-test)
  command to run the test: docker-compose run k6 run /src/tests/app/process.js 
  -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** -e sblaccesskey=***
*/

import { check } from 'k6';
import { addErrorCount } from '../../errorcounter.js';
import * as appInstances from '../../api/app/instances.js';
import * as appData from '../../api/app/data.js';
import * as appProcess from '../../api/app/process.js';
import * as platformInstances from '../../api/platform/storage/instances.js';
import { deleteSblInstance } from '../../api/platform/storage/messageboxinstances.js';
import * as apps from '../../api/platform/storage/applications.js';
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
  setupTimeout: '1m',
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

//Tests for App API: Process
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  var instanceId = data['instanceId'];
  var dataId = data['dataId'];
  const attachmentDataType = data['attachmentDataType'];

  //Test to start process of an app instance again and verify response code to be 409
  var res = appProcess.postStartProcess(runtimeToken, partyId, instanceId, appOwner, level2App);
  var success = check(res, {
    'App POST Start process again Not Possible status is 409': (r) => r.status === 409,
  });
  addErrorCount(success);

  //Test to get current process of an app instance and verify response code to be 200
  res = appProcess.getCurrentProcess(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'App GET current process status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  var currentProcessElement = JSON.parse(res.body).currentTask.elementId;

  //Test to move the process of an app instance to the current process element and verify response code to be 409
  res = appProcess.putNextProcess(runtimeToken, partyId, instanceId, currentProcessElement, appOwner, level2App);
  success = check(res, {
    'App PUT Move process to current process element Not Possible status is 409': (r) => r.status === 409,
  });
  addErrorCount(success);

  //update instance date for completing the process of the instance
  appData.putDataById(runtimeToken, partyId, instanceId, dataId, 'default', instanceFormDataXml, appOwner, level2App);
  appData.postData(runtimeToken, partyId, instanceId, attachmentDataType, pdfAttachment, appOwner, level2App);

  //Test to get next process of an app instance again and verify response code  to be 200
  res = appProcess.getNextProcess(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'App GET Next process status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Test to get the process history of an app instance and verify the response code to be 200
  res = appProcess.getProcessHistory(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'App GET Process history': (r) => r.status === 200,
  });

  //Test to complete the process of an app instance and verify the response code to be 200
  res = appProcess.putCompleteProcess(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'App Complete instance process': (r) => r.status === 200,
  });

  //Test to complete an instance process again and check response code to be 409
  res = appProcess.putCompleteProcess(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'App Complete instance process again status is 409': (r) => r.status === 409,
  });
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
  result[reportPath('appProcess')] = generateJUnitXML(data, 'app-process');
  return result;
}
