import http from 'k6/http';
import * as config from '../../config.js';
import * as header from '../../buildrequestheaders.js';

//Request to get user profile by user id and returns the response
export function getProfile(userId, altinnStudioRuntimeCookie) {
  var endpoint = config.platformProfile['users'] + userId;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  var res = http.get(endpoint, params);
  return res;
}

//Request to get user profile by SSN in body and returns the response
export function postFetchProfileBySSN(ssn, altinnStudioRuntimeCookie) {
  var endpoint = config.platformProfile['users'];
  var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie, 'platform');
  var requestBody = JSON.stringify(ssn);
  var res = http.post(endpoint, requestBody, params);
  return res;
}
