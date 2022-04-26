/*
  Test data required: deployed app (reference app: ttd/apps-test)
  Command: docker-compose run k6 run /src/tests/platform/authorization/delegations/inheritance.js
  -e env=*** -e org=*** -e app=***  -e tokengenuser=*** -e tokengenuserpwd=*** -e appsaccesskey=***
  -e user1name=*** -e user1pwd=*** -e user2name=*** -e user2pwd=***
*/
import { check, sleep } from 'k6';
import { addErrorCount, stopIterationOnFail } from '../../../../errorcounter.js';
import * as delegation from '../../../../api/platform/authorization/delegations.js';
import { generateToken } from '../../../../api/altinn-testtools/token-generator.js';
import { generateJUnitXML, reportPath } from '../../../../report.js';
import * as setUpData from '../../../../setup.js';

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
    user2Data: userData2
  };
  
  return data;
}

//Tests for platform Authorization:Delegations:Inheritance
export default function (data) {
  const altinnToken = data.altinnToken;
  const userId1 = data.user1Data['userId'];
  const partyId1 = data.user1Data['partyId'];
  const userId2 = data.user2Data['userId'];
  const partyId2 = data.user2Data['partyId'];
  var res, success, policyMatchKeys, ruleId, resources;

  resources = [{ appOwner: appOwner, appName: appName }];

  //Add read access to a party id for app in a particular task
  policyMatchKeys = {
    coveredBy: 'urn:altinn:partyid',
    resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:task'],
  };
  res = delegation.addRules(altinnToken, policyMatchKeys, userId1, partyId1, partyId2, appOwner, appName, 'Task_1', 'read');
  success = check(res, {
    'Add delegation rule - status is 201': (r) => r.status === 201,
  });
  addErrorCount(success);
  stopIterationOnFail('Add delegation rule Failed', success, res);

  ruleId = res.json('0.ruleId');

  sleep(3);

  //Retrieve all the rules that are inherited via keyrole
  policyMatchKeys = {
    coveredBy: 'urn:altinn:userid',
    resource: ['urn:altinn:app', 'urn:altinn:org'],
  };
  res = delegation.getRules(altinnToken, policyMatchKeys, partyId1, 999, resources, null, [partyId2]);
  success = check(res, {
    'Inherited Via KeyRole - status is 200': (r) => r.status === 200,
    'Inherited Via KeyRole - rule id matches': (r) => r.json('0.ruleId') === ruleId,
    'Inherited Via KeyRole - createdSuccessfully is false': (r) => r.json('0.createdSuccessfully') === false,
    'Inherited Via KeyRole - offeredByPartyId matches': (r) => r.json('0.offeredByPartyId') === partyId1,
    'Inherited Via KeyRole - coveredBy is partyid': (r) => r.json('0.coveredBy.0.id') === 'urn:altinn:partyid',
    'Inherited Via KeyRole - coveredBy matches': (r) => r.json('0.coveredBy.0.value') === partyId2.toString(),
    'Inherited Via KeyRole - type is 2': (r) => r.json('0.type') === 2,
  });
  addErrorCount(success);

  //Retrieve rules that are inherited as subunit via keyrole
  res = delegation.getRules(altinnToken, policyMatchKeys, null, 999, resources, partyId1, [partyId2]);
  success = check(res, {
    'Inherited As Subunit Via Keyrole - status is 200': (r) => r.status === 200,
    'Inherited As Subunit Via Keyrole - rule id matches': (r) => r.json('0.ruleId') === ruleId,
    'Inherited As Subunit Via Keyrole - type is 4': (r) => r.json('0.type') === 4,
    'Inherited As Subunit Via Keyrole - coveredBy is partyid': (r) => r.json('0.coveredBy.0.id') === 'urn:altinn:partyid',
  });
  addErrorCount(success);

  //Delete all the delegated rules from an user by a party
  policyMatchKeys = {
    coveredBy: 'urn:altinn:partyid',
    resource: ['urn:altinn:app', 'urn:altinn:org'],
  };
  res = delegation.deletePolicy(altinnToken, policyMatchKeys, userId1, partyId1, partyId2, appOwner, appName, null);
  success = check(res, {
    'Delete delegated policy with all rules - status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  sleep(3);

  //Add read access to an user id for app in a particular task
  policyMatchKeys = {
    coveredBy: 'urn:altinn:userid',
    resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:task'],
  };
  res = delegation.addRules(altinnToken, policyMatchKeys, userId1, partyId1, userId2, appOwner, appName, 'Task_1', 'read');
  success = check(res, {
    'Add delegation rule - status is 201': (r) => r.status === 201,
  });
  addErrorCount(success);
  stopIterationOnFail('Add delegation rule Failed', success, res);

  ruleId = res.json('0.ruleId');

  sleep(3);

  //Retrieve rules that are inherited as subunit
  policyMatchKeys = {
    coveredBy: 'urn:altinn:userid',
    resource: ['urn:altinn:app', 'urn:altinn:org'],
  };
  res = delegation.getRules(altinnToken, policyMatchKeys, null, userId2, resources, partyId1, null);
  success = check(res, {
    'Inherited As Subunit - status is 200': (r) => r.status === 200,
    'Inherited As Subunit - rule id matches': (r) => r.json('0.ruleId') === ruleId,
    'Inherited As Subunit - createdSuccessfully is false': (r) => r.json('0.createdSuccessfully') === false,
    'Inherited As Subunit - offeredByPartyId matches': (r) => r.json('0.offeredByPartyId') === partyId1,
    'Inherited As Subunit - coveredBy is userid': (r) => r.json('0.coveredBy.0.id') === 'urn:altinn:userid',
    'Inherited As Subunit - coveredBy matches': (r) => r.json('0.coveredBy.0.value') === userId2.toString(),
    'Inherited As Subunit - type is 3': (r) => r.json('0.type') === 3,
  });

  //Delete all the delegated rules from an user by a party
  policyMatchKeys = {
    coveredBy: 'urn:altinn:userid',
    resource: ['urn:altinn:app', 'urn:altinn:org'],
  };
  res = delegation.deletePolicy(altinnToken, policyMatchKeys, userId1, partyId1, userId2, appOwner, appName, null);
  success = check(res, {
    'Delete delegated policy with all rules - status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('authzDelegationInheritance.xml')] = generateJUnitXML(data, 'platform-authorization-delegation-inheritance');
  return result;
}
