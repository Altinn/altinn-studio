/* 
  Test data required: deployed app (reference app: ttd/apps-test)
  Command: docker-compose run k6 run /src/tests/platform/authorization/delegations.js 
  -e env=*** -e org=*** -e app=***  -e tokengenuser=*** -e tokengenuserpwd=*** -e appsaccesskey=***
*/
import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
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
  var res, success;

  res = delegation.getPolicies(appOwner, appName);
  success = check(res, {
    'GET app policy - status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('authzDelegation')] = generateJUnitXML(data, 'platform-authorization-delegation');
  return result;
}
