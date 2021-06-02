import http from 'k6/http';
import * as config from '../../config.js';
import * as header from '../../buildrequestheaders.js';
import { stopIterationOnFail } from '../../errorcounter.js';

//Request to convert a maskinporten token and returns altinnstudioruntime token for en appOwner
export function convertMaskinPortenToken(maskinportentoken, isTest) {
  if (!maskinportentoken) stopIterationOnFail('maskinporten token is undefined', false, null);
  var endpoint = config.platformAuthentication['maskinporten'] + '?test=' + isTest;
  var params = header.buildHearderWithRuntime(maskinportentoken);
  var token = http.get(endpoint, params);
  token = token.body;
  return token;
}
