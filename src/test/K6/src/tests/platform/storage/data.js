/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run /src/tests/platform/storage/data.js 
    -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** -e sblaccesskey=***
*/

import { check } from 'k6';
import * as apps from '../../../api/platform/storage/applications.js';
import * as instances from '../../../api/platform/storage/instances.js';
import * as instanceData from '../../../api/platform/storage/data.js';
import * as sbl from '../../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../../setup.js';
import { addErrorCount } from '../../../errorcounter.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;
let instanceJson = open('../../../data/instance.json');
let instanceFormDataXml = open('../../../data/' + level2App + '.xml');
let pdfAttachment = open('../../../data/test_file_pdf.pdf', 'b');

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup data and return AltinnstudioRuntime Token, instance and user details
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  setUpData.clearCookies();
  var attachmentDataType = apps.getAppByName(altinnStudioRuntimeCookie, appOwner, level2App);
  attachmentDataType = apps.findAttachmentDataType(attachmentDataType.body);
  data.attachmentDataType = attachmentDataType;
  var instanceId = instances.postInstance(altinnStudioRuntimeCookie, data['partyId'], appOwner, level2App, instanceJson);
  instanceId = instances.findInstanceId(instanceId.body);
  data.instanceId = instanceId;
  return data;
}

//Tests for platform Storage: Instance Data
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  const attachmentDataType = data['attachmentDataType'];
  const instanceId = data['instanceId'];
  var dataId = '';
  var res, success;

  //Test to add an form data to an instance with storage api and validate the response
  res = instanceData.postData(runtimeToken, partyId, instanceId, 'default', instanceFormDataXml);
  success = check(res, {
    'POST Create Data status is 201': (r) => r.status === 201,
    'POST Create Instance Data Id is not null': (r) => JSON.parse(r.body).id != null,
  });
  addErrorCount(success);

  dataId = JSON.parse(res.body).id;

  //Test to get a data from an instance by id and validate the response
  res = instanceData.getData(runtimeToken, partyId, instanceId, dataId);
  success = check(res, {
    'GET Data by Id status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Test to edit a data in an instance and validate the response
  res = instanceData.putData(runtimeToken, partyId, instanceId, dataId, 'default', instanceFormDataXml);
  success = check(res, {
    'PUT Edit Data by Id status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Test to add a pdf attachment to an instance with storage api and validate the response
  res = instanceData.postData(runtimeToken, partyId, instanceId, attachmentDataType, pdfAttachment);
  success = check(res, {
    'POST Add Attachment status is 201': (r) => r.status === 201,
    'POST Add Attachment Data Id is not null': (r) => JSON.parse(r.body).id != null,
  });
  addErrorCount(success);

  dataId = JSON.parse(res.body).id;

  //Test to delete a data from an instance by id and validate the response
  res = instanceData.deleteData(runtimeToken, partyId, instanceId, dataId);
  success = check(res, {
    'DELETE Attachment Data status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Test to get all the dataelement of an instance and validate the response
  res = instanceData.getAllDataElements(runtimeToken, partyId, instanceId);
  success = check(res, {
    'GET All DataElements status is 200': (r) => r.status === 200,
    'GET All DataElements DataElements count is 1': (r) => JSON.parse(r.body).dataElements.length === 1,
  });
  addErrorCount(success);
}

//Delete the instance created
export function teardown(data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  const instanceId = data['instanceId'];

  sbl.deleteSblInstance(runtimeToken, partyId, instanceId, 'true');
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformStorageData')] = generateJUnitXML(data, 'platform-storage-data');
  return result;
}
