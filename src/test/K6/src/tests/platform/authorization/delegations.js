/* 
  Test data required: deployed app (reference app: ttd/apps-test)
  Command: docker-compose run k6 run /src/tests/platform/authorization/delegations.js 
  -e env=*** -e org=*** -e app=***  -e tokengenuser=*** -e tokengenuserpwd=*** -e appsaccesskey=***
*/
import { check } from 'k6';
import { addErrorCount, stopIterationOnFail } from '../../../errorcounter.js';
import * as delegation from '../../../api/platform/authorization/delegations.js';
import { generateToken } from '../../../api/altinn-testtools/token-generator.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const appOwner = __ENV.org;
const appName = __ENV.app;
const environment = __ENV.env.toLowerCase();
const tokenGeneratorUserName = __ENV.tokengenuser;
const tokenGeneratorUserPwd = __ENV.tokengenuserpwd;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

export function setup() {
  var tokenGenParams = {
    env: environment,
    app: 'sbl.authorization',
  };
  var altinnToken = generateToken('platform', tokenGeneratorUserName, tokenGeneratorUserPwd, tokenGenParams);
  return altinnToken;
}

//Tests for platform Authorization:Delegations
export default function (data) {
  const altinnToken = data;
  var res, success, policyMatchKeys, ruleId;

  res = delegation.getPolicies(appOwner, appName);
  success = check(res, {
    'GET app policy - status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  policyMatchKeys = {
    coveredBy: 'urn:altinn:userid',
    resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:task'],
  };
  res = delegation.addRules(altinnToken, policyMatchKeys, 111, 123, 456, appOwner, appName, 'Task_1', 'read');
  success = check(res, {
    'Add delegation rule - status is 201': (r) => r.status === 201,
    'Add delegation rule - rule id is not empty': (r) => r.json('0.ruleId') != null,
    'Add delegation rule - createdSuccessfully is true': (r) => r.json('0.createdSuccessfully') === true,
    'Add delegation rule - offeredByPartyId matches': (r) => r.json('0.offeredByPartyId') === 123,
    'Add delegation rule - coveredBy matches': (r) => r.json('0.coveredBy.0.value') === '456',
  });
  addErrorCount(success);
  stopIterationOnFail('Add delegation rule Failed', success, res);

  ruleId = res.json('0.ruleId');

  res = delegation.addRules(altinnToken, policyMatchKeys, 111, 123, 456, appOwner, 'test', 'Task_1', 'read');
  success = check(res, {
    'Add delegation rule for an invalid app - status is 400': (r) => r.status === 400,
    'Add delegation rule for an invalid app - failed': (r) => r.body == 'Delegation could not be completed',
  });
  addErrorCount(success);

  policyMatchKeys = {
    coveredBy: 'urn:altinn:userid',
    resource: ['urn:altinn:app', 'urn:altinn:org'],
  };
  res = delegation.getRules(altinnToken, policyMatchKeys, 123, 456, appOwner, appName, null);
  success = check(res, {
    'Get delegated rule - status is 200': (r) => r.status === 200,
    'Get delegated rule - rule id matches': (r) => r.json('0.ruleId') === ruleId,
    'Get delegated rule - createdSuccessfully is false': (r) => r.json('0.createdSuccessfully') === false,
    'Get delegated rule - offeredByPartyId matches': (r) => r.json('0.offeredByPartyId') === 123,
    'Get delegated rule - coveredBy matches': (r) => r.json('0.coveredBy.0.value') === '456',
  });
  addErrorCount(success);

  policyMatchKeys = {
    coveredBy: 'urn:altinn:userid',
    resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:task'],
  };
  res = delegation.deleteRules(altinnToken, policyMatchKeys, [ruleId], 111, 123, 456, appOwner, appName, 'Task_1', 'read');
  success = check(res, {
    'Delete delegated rule - status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('authzDelegation')] = generateJUnitXML(data, 'platform-authorization-delegation');
  return result;
}
