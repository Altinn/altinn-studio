import http from 'k6/http';
import encoding from 'k6/encoding';
import * as config from '../../config.js';
import * as support from '../../support.js';
import { stopIterationOnFail } from '../../errorcounter.js';

//Request to generate pdf from a json and returns the response
export function getEnterpriseToken(userName, userPwd, queryParams) {
  const credentials = `${userName}:${userPwd}`;
  const encodedCredentials = encoding.b64encode(credentials);
  var endpoint = `${config.tokenGenerator.getEnterpriseToken}${support.buildQueryParametersForEndpoint(queryParams)}`;
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
