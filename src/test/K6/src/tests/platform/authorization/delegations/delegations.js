/*
  Test data required: deployed app (reference app: ttd/apps-test)
  Command: docker-compose run k6 run /src/tests/platform/authorization/delegations/delegations.js
  -e env=*** -e org=*** -e app=***  -e tokengenuser=*** -e tokengenuserpwd=*** -e appsaccesskey=***
  -e user1name=*** -e user1pwd=*** -e user2name=*** -e user2pwd=***
*/
import { check, sleep } from 'k6';
import { addErrorCount, stopIterationOnFail } from '../../../../errorcounter.js';
import * as delegation from '../../../../api/platform/authorization/delegations.js';
import * as authz from '../../../../api/platform/authorization/authorization.js';
import { generateToken } from '../../../../api/altinn-testtools/token-generator.js';
import { generateJUnitXML, reportPath } from '../../../../report.js';
import * as setUpData from '../../../../setup.js';

let pdpInputJson = open('../../../../data/pdpinput.json');

const appOwner = __ENV.org;
const appName = __ENV.app;
const environment = __ENV.env.toLowerCase();
const tokenGeneratorUserName = __ENV.tokengenuser;
const tokenGeneratorUserPwd = __ENV.tokengenuserpwd;
const user1Name = __ENV.user1name;
const user1Pwd = __ENV.user1pwd;
const user2Name = __ENV.user2name;
const user2Pwd = __ENV.user2pwd;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

export function setup() {
  var aspxauthCookie1 = setUpData.authenticateUser(user1Name, user1Pwd);
  var altinnStudioRuntimeCookie1 = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie1);
  var userData1 = setUpData.getUserData(altinnStudioRuntimeCookie1, appOwner, appName);

  var aspxauthCookie2 = setUpData.authenticateUser(user2Name, user2Pwd);
  var altinnStudioRuntimeCookie2 = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie2);
  var userData2 = setUpData.getUserData(altinnStudioRuntimeCookie2, appOwner, appName);

  var tokenGenParams = {
    env: environment,
    app: 'sbl.authorization',
  };
  var data = {
    altinnToken: generateToken('platform', tokenGeneratorUserName, tokenGeneratorUserPwd, tokenGenParams),
    user1Data: userData1,
    user2Data: userData2,
  };

  return data;
}

//Tests for platform Authorization:Delegations
export default function (data) {
  const altinnToken = data.altinnToken;
  const userId1 = data.user1Data['userId'];
  const partyId1 = data.user1Data['partyId'];
  const userId2 = data.user2Data['userId'];
  var res, success, policyMatchKeys, ruleId, jsonPermitData, resources;

  //Retrieve policy of an app
  resources = [{ appOwner: appOwner, appName: appName }];
  res = delegation.getPolicies(resources);
  success = check(res, {
    'GET app policy - status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Add read access to an user for app in a particular task
  policyMatchKeys = {
    coveredBy: 'urn:altinn:userid',
    resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:task'],
  };
  res = delegation.addRules(altinnToken, policyMatchKeys, userId1, partyId1, userId2, appOwner, appName, 'Task_1', 'read');
  success = check(res, {
    'Add delegation rule - status is 201': (r) => r.status === 201,
    'Add delegation rule - rule id is not empty': (r) => r.json('0.ruleId') != null,
    'Add delegation rule - createdSuccessfully is true': (r) => r.json('0.createdSuccessfully') === true,
    'Add delegation rule - offeredByPartyId matches': (r) => r.json('0.offeredByPartyId') === partyId1,
    'Add delegation rule - coveredBy matches': (r) => r.json('0.coveredBy.0.value') === userId2.toString(),
  });
  addErrorCount(success);
  stopIterationOnFail('Add delegation rule Failed', success, res);

  ruleId = res.json('0.ruleId');

  sleep(3);

  //Delete the delegated read access rule
  res = delegation.deleteRules(altinnToken, policyMatchKeys, [ruleId], userId1, partyId1, userId2, appOwner, appName, 'Task_1', 'read');
  success = check(res, {
    'Delete delegated rule - status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Deleting a non existing rules fails
  res = delegation.deleteRules(altinnToken, policyMatchKeys, [ruleId], userId1, partyId1, userId2, appOwner, appName, 'Task_1', 'read');
  success = check(res, {
    'Delete a not existing rule - status is 400': (r) => r.status === 400,
  });
  addErrorCount(success);

  //Rules cannot be delegated with invalid app details
  res = delegation.addRules(altinnToken, policyMatchKeys, userId1, partyId1, userId2, appOwner, 'test', 'Task_1', 'read');
  success = check(res, {
    'Add delegation rule for an invalid app - status is 400': (r) => r.status === 400,
    'Add delegation rule for an invalid app - failed': (r) => r.body == 'Delegation could not be completed',
  });
  addErrorCount(success);

  //add a rule to give write access
  res = delegation.addRules(altinnToken, policyMatchKeys, userId1, partyId1, userId2, appOwner, appName, 'Task_1', 'write');
  ruleId = res.json('0.ruleId');
  sleep(3);

  //Retrieve all the rules that are delegated to an user from a party
  policyMatchKeys = {
    coveredBy: 'urn:altinn:userid',
    resource: ['urn:altinn:app', 'urn:altinn:org'],
  };
  res = delegation.getRules(altinnToken, policyMatchKeys, partyId1, userId2, resources, null, null);
  success = check(res, {
    'Get delegated rule - status is 200': (r) => r.status === 200,
    'Get delegated rule - rule id matches': (r) => r.json('0.ruleId') === ruleId,
    'Get delegated rule - createdSuccessfully is false': (r) => r.json('0.createdSuccessfully') === false,
    'Get delegated rule - offeredByPartyId matches': (r) => r.json('0.offeredByPartyId') === partyId1,
    'Get delegated rule - coveredBy matches': (r) => r.json('0.coveredBy.0.value') === userId2.toString(),
    'Get delegated rule - type is 1': (r) => r.json('0.type') === 1,
  });
  addErrorCount(success);

  //Decision to write is permit based on the delegated rule
  jsonPermitData = {
    AccessSubject: ['urn:altinn:userid'],
    Action: ['write'],
    Resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:partyid', 'urn:altinn:task'],
  };
  res = authz.postGetDecision(pdpInputJson, jsonPermitData, appOwner, appName, userId2, partyId1, 'Task_1');
  success = check(res, {
    'Get PDP Decision for delegated rule Status is 200': (r) => r.status === 200,
    'Get PDP Decision for delegated rule - decision is permit': (r) => r.json('response.0.decision') === 'Permit',
  });
  addErrorCount(success);

  //Delete all the delegated rules from an user by a party
  res = delegation.deletePolicy(altinnToken, policyMatchKeys, userId1, partyId1, userId2, appOwner, appName, null);
  success = check(res, {
    'Delete delegated policy with all rules - status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);
  sleep(3);

  //Get rules that are deleted where response should be an empty array
  res = delegation.getRules(altinnToken, policyMatchKeys, partyId1, userId2, resources, null, null);
  success = check(res, {
    'Get deleted rules - status is 200': (r) => r.status === 200,
    'Get deleted rules - response is empty': (r) => r.json().length === 0,
  });
  addErrorCount(success);

  //User can no longer write to app instance after delegate policy is deleted
  res = authz.postGetDecision(pdpInputJson, jsonPermitData, appOwner, appName, userId2, partyId1, 'Task_1');
  success = check(res, {
    'Get PDP Decision for deleted rule - Status is 200': (r) => r.status === 200,
    'Get PDP Decision for deleted rule - decision is notapplicable': (r) => r.json('response.0.decision') === 'NotApplicable',
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('authzDelegation.xml')] = generateJUnitXML(data, 'platform-authorization-delegation');
  return result;
}
