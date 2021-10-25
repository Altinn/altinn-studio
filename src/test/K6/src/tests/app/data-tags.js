/* 
  Test data required: username, password, app requiring level 2 login (reference app: ttd/apps-test)
  command to run the test: docker-compose run k6 run /src/tests/app/data-tags.js 
  -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** -e sblaccesskey=***
*/

import { check } from 'k6';
import { addErrorCount } from '../../errorcounter.js';
import * as appInstances from '../../api/app/instances.js';
import * as appData from '../../api/app/data.js';
import * as appDataTags from '../../api/app/data-tags.js';
import * as platformInstances from '../../api/platform/storage/instances.js';
import * as apps from '../../api/platform/storage/applications.js';
import { deleteSblInstance } from '../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../setup.js';
import { generateJUnitXML, reportPath } from '../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const appName = __ENV.level2app;
let pdfAttachment = open('../../data/test_file_pdf.pdf', 'b');

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
};

export function setup() {
  const aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  const altinnToken = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnToken, appOwner, appName);
  data.altinnToken = altinnToken;
  setUpData.clearCookies();
  var attachmentDataType = apps.getAppByName(altinnToken, appOwner, appName);
  attachmentDataType = apps.findAttachmentDataType(attachmentDataType.body);
  data.attachmentDataType = attachmentDataType;
  var instanceId = appInstances.postInstance(altinnToken, data['partyId'], appOwner, appName);
  data.instanceId = platformInstances.findInstanceId(instanceId.body);
  var dataId = appData.postData(altinnToken, data['partyId'], data['instanceId'], attachmentDataType, pdfAttachment, 'pdf', appOwner, appName);
  data.dataId = JSON.parse(dataId.body).id;
  return data;
}

//Tests for App API: DataTags
export default function (data) {
  const altinnToken = data['altinnToken'];
  const partyId = data['partyId'];
  const instanceId = data['instanceId'];
  const dataId = data['dataId'];
  const attachmentDataType = data['attachmentDataType'];
  var res, success, tags;

  res = appDataTags.createDataTags(altinnToken, partyId, instanceId, dataId, appOwner, appName, 'automation');
  success = check(res, {
    'POST Create data tags - status is 201': (r) => r.status === 201,
    'Created data tag matches': (r) => r.json('tags')[0] === 'automation',
  });
  addErrorCount(success);

  res = appDataTags.getDataTags(altinnToken, partyId, instanceId, dataId, appOwner, appName);
  success = check(res, {
    'GET data tags - status is 200': (r) => r.status === 200,
    'GET data tag matches': (r) => r.json('tags')[0] === 'automation',
  });
  addErrorCount(success);

  res = appDataTags.createDataTags(altinnToken, partyId, instanceId, dataId, appOwner, appName, 'te/!st');
  success = check(res, {
    'Tags cannot be created with invalid characters - status is 400': (r) => r.status === 400,
  });
  addErrorCount(success);

  res = appInstances.getInstanceById(altinnToken, partyId, instanceId, appOwner, appName);
  var dataElements = res.json('data');
  if (dataElements.length > 0) {
    for (var i = 0; i < dataElements.length; i++) {
      if (dataElements[i].dataType == attachmentDataType) {
        tags = dataElements[i].tags;
      }
    }
  }

  success = check(tags, {
    'Tags in the data element is fetched': (r) => r[0] === 'automation',
  });
  addErrorCount(success);

  res = appDataTags.deleteDataTags(altinnToken, partyId, instanceId, dataId, appOwner, appName, 'automation');
  success = check(res, {
    'Delete data tags - status is 204': (r) => r.status === 204,
  });
  addErrorCount(success);
}

export function teardown(data) {
  const altinnToken = data['altinnToken'];
  const partyId = data['partyId'];
  const instanceId = data['instanceId'];

  deleteSblInstance(altinnToken, partyId, instanceId, 'true');
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('appDataTags')] = generateJUnitXML(data, 'app-data-tags');
  return result;
}
