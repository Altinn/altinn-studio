import http from 'k6/http';
import * as config from '../../config.js';
import * as header from '../../buildrequestheaders.js';

//Request to platform receipt component and returns the response with instance details and party information
export function getReceipt(partyId, instanceId, altinnStudioRuntimeCookie) {
  var endpoint = config.platformReceipt['receipt'] + '/' + partyId + '/' + instanceId + '?includeParty=true';
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}
