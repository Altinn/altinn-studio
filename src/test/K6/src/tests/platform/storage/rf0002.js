import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { addErrorCount } from '../../../errorcounter.js';
import * as instances from '../../../api/platform/storage/instances.js';
import * as instanceData from '../../../api/platform/storage/data.js';
import * as setUpData from '../../../setup.js';
import * as apps from '../../../api/platform/storage/applications.js';
import * as sbl from '../../../api/platform/storage/messageboxinstances.js';
import { postPartieslookup } from '../../../api/platform/register.js';

const appOwner = __ENV.org;
const level2App = __ENV.level2app;
const environment = __ENV.env.toLowerCase();
const fileName = 'users_' + environment + '.json';

let instanceFormDataXml = open('../../../data/' + level2App + '.xml');
let instanceJson = open('../../../data/instance.json');
let users = new SharedArray('test users', function () {
  var usersArray = JSON.parse(open('../../data/' + fileName));
  return usersArray;
});
const usersCount = users.length;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Tests for platform Storage: RF-0002
export default function () {
  var userNumber = (__VU - 1) % usersCount;
  var instanceId, res, success;

  try {
    var userSSN = users[userNumber].username;
    var userPwd = users[userNumber].password;
  } catch (error) {
    stopIterationOnFail('Testdata missing', false, null);
  }

  var aspxauthCookie = setUpData.authenticateUser(userSSN, userPwd);
  var runtimeToken = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  setUpData.clearCookies();
  var data = setUpData.getUserData(runtimeToken, appOwner, level2App);
  var attachmentDataType = apps.getAppByName(runtimeToken, appOwner, level2App);
  attachmentDataType = apps.findAttachmentDataType(attachmentDataType.body);
  var orgPartyId = postPartieslookup(runtimeToken, 'OrgNo', data['orgNumber']);
  data.orgPartyId = JSON.parse(orgPartyId.body).partyId;
  const partyId = data['orgPartyId'];
  instanceId = '';

  //Test to create an instance with storage api and validate the response
  res = instances.postInstance(runtimeToken, partyId, appOwner, level2App, instanceJson);
  success = check(res, {
    'POST Create Instance status is 201': (r) => r.status === 201,
    'POST Create Instance Instance Id is not null': (r) => JSON.parse(r.body).id != null,
  });
  addErrorCount(success);

  if (JSON.parse(res.body).id != null) {
    instanceId = instances.findInstanceId(res.body);
  }

  //Test to get an instance by id from storage and validate the response
  res = instances.getInstanceById(runtimeToken, partyId, instanceId);
  success = check(res, {
    'GET Instance by Id status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Test to add an form data to an instance with storage api and validate the response
  res = instanceData.postData(runtimeToken, partyId, instanceId, 'schema_4222_160523_forms_212_20160523', instanceFormDataXml, null);
  success = check(res, {
    'POST Create Data status is 201': (r) => r.status === 201,
    'POST Create Instance Data Id is not null': (r) => JSON.parse(r.body).id != null,
  });
  addErrorCount(success);

  //Hard delete the instance
  sbl.deleteSblInstance(runtimeToken, partyId, instanceId, 'true');
}
