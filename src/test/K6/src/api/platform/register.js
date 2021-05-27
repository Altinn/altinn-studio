import http from 'k6/http';
import * as config from '../../config.js';
import * as header from '../../buildrequestheaders.js';

//Request to get an org by org number and returns the response
export function getOrganizations(altinnStudioRuntimeCookie, orgNr) {
  var endpoint = config.platformRegister['organizations'] + orgNr;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}

//Request to get an partyinfo by partyid number and returns the response
export function getParty(altinnStudioRuntimeCookie, partyId) {
  var endpoint = config.platformRegister['parties'] + partyId;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}

//Request to get party info by SSN or Org and returns the response where type be SSN or OrgNo
export function postPartieslookup(altinnStudioRuntimeCookie, type, value) {
  var endpoint = config.platformRegister['lookup'];
  var requestBody = type == 'ssn' ? { SSN: value } : { OrgNo: value };
  requestBody = JSON.stringify(requestBody);
  var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie, 'platform');
  return http.post(endpoint, requestBody, params);
}
