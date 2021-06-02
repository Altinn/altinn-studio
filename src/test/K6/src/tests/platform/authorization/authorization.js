/* 
  Test data required: test app with uploaded policy in blob, username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
  Command: docker-compose run k6 run /src/tests/platform/authorization/authorization.js 
  -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=***  -e appsaccesskey=***
*/
import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as authz from '../../../api/platform/authorization.js';
import * as setUpData from '../../../setup.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const appName = __ENV.level2app;
let policyFile = open('../../../data/policy.xml', 'b');
let pdpInputJson = open('../../../data/pdpinput.json');

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup data and return userData
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, appName);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  return data;
}

//Tests for platform Authorization
export default function (data) {
  const userId = data['userId'];
  const partyId = data['partyId'];
  const runtimeToken = data['RuntimeToken'];
  var altinnTask = '';
  var res, success;

  //Test Platform: Authorization: Get parties of an user and validate response
  res = authz.getParties(userId);
  success = check(res, {
    'GET Parties Status is 200': (r) => r.status === 200,
    'GET Parties Parties list is not empty': (r) => JSON.parse(r.body).length != null,
  });
  addErrorCount(success);

  //Test Platform: Authorization: Get roles of the user self
  res = authz.getRoles(userId, partyId);
  success = check(res, {
    'GET Roles Status is 200': (r) => r.status === 200,
    'GET Roles Roles list is not empty': (r) => JSON.parse(r.body).length != null,
  });
  addErrorCount(success);

  //Test Platform: Authorization: Upload app policy to storage
  res = authz.postPolicy(policyFile, appOwner, appName, runtimeToken);
  success = check(res, {
    'POST Policy Status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);

  //Test Platform: Authorization: Get a decision from PDP with appOwner details
  //and validate response to have Permit
  var jsonPermitData = {
    AccessSubject: ['urn:altinn:org'],
    Action: ['read'],
    Resource: ['urn:altinn:app', 'urn:altinn:org'],
  };
  res = authz.postGetDecision(pdpInputJson, jsonPermitData, appOwner, appName, userId, partyId, altinnTask);
  success = check(res, {
    'Get PDP Decision for appOwner Status is 200': (r) => r.status === 200,
    'Get PDP Decision for appOwner Decision is Permit': (r) => JSON.parse(r.body).response[0].decision === 'Permit',
  });
  addErrorCount(success);

  //Test Platform: Authorization: Get a decision from PDP with appOwner details
  //and validate response to have NotApplicable
  jsonPermitData = {
    AccessSubject: ['urn:altinn:org'],
    Action: ['sign'],
    Resource: ['urn:altinn:app', 'urn:altinn:org'],
  };
  altinnTask = '';
  res = authz.postGetDecision(pdpInputJson, jsonPermitData, appOwner, appName, userId, partyId, altinnTask);
  success = check(res, {
    'Get PDP Decision for appOwner Status is 200': (r) => r.status === 200,
    'Get PDP Decision for appOwner Decision is NotApplicable': (r) => JSON.parse(r.body).response[0].decision === 'NotApplicable',
  });
  addErrorCount(success);

  //Test Platform: Authorization: Get a decision from PDP with user details
  //and validate response to have Permit
  jsonPermitData = {
    AccessSubject: ['urn:altinn:userid'],
    Action: ['read'],
    Resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:partyid', 'urn:altinn:task'],
  };
  altinnTask = 'Task_1';
  res = authz.postGetDecision(pdpInputJson, jsonPermitData, appOwner, appName, userId, partyId, altinnTask);
  success = check(res, {
    'Get PDP Decision for User Status is 200': (r) => r.status === 200,
    'Get PDP Decision for User Decision is Permit': (r) => JSON.parse(r.body).response[0].decision === 'Permit',
  });
  addErrorCount(success);

  //Test Platform: Authorization: Get a decision from PDP with user details for reading events
  //and validate response to have Permit
  jsonPermitData = {
    AccessSubject: ['urn:altinn:userid'],
    Action: ['read'],
    Resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:partyid', 'urn:altinn:appresource'],
  };
  altinnTask = '';
  res = authz.postGetDecision(pdpInputJson, jsonPermitData, appOwner, appName, userId, partyId, altinnTask);
  success = check(res, {
    'Get PDP Decision for reading events is 200': (r) => r.status === 200,
    'Get PDP Decision for reading events is Permit': (r) => JSON.parse(r.body).response[0].decision === 'Permit',
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformAuthZ')] = generateJUnitXML(data, 'platform-authorization');
  return result;
}
