import http from 'k6/http';
import encoding from 'k6/encoding';
import * as config from '../../config.js';
import * as support from '../../support.js';
import { stopIterationOnFail } from '../../errorcounter.js';

/**
 * only for test environments - api call to get enterprise or personal token with requested scopes and other params
 * @param {string} tokenFor enterprise or personal
 * @param {string} userName user name for basic authentication
 * @param {string} userPwd password for basic authentication
 * @param {JSON} queryParams for enterprise: { env: 'at22', scopes: 'altinn:serviceowner/instances.read', org: 'ttd', orgNo: '991825827', }
 * for personal: { env: 'at22', scopes: 'altinn:instances.read', userId: 123, partyId: 123, authLvl: 3, pid: '11 digit ssn', }
 * @returns jwt token for enterprise or person with supplied params
 */
export function generateToken(tokenFor, userName, userPwd, queryParams) {
  const credentials = `${userName}:${userPwd}`;
  const encodedCredentials = encoding.b64encode(credentials);
  var endpoint;

  if (tokenFor === 'enterprise') endpoint = config.tokenGenerator.getEnterpriseToken;
  if (tokenFor === 'personal') endpoint = config.tokenGenerator.getPersonalToken;
  endpoint += support.buildQueryParametersForEndpoint(queryParams);

  var params = {
    headers: {
      Authorization: `Basic ${encodedCredentials}`,
    },
  };

  var token = http.get(endpoint, params);
  if (token.status != 200) stopIterationOnFail('token gen failed', false, token);
  token = token.body;
  return token;
}
