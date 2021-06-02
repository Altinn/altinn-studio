import http from 'k6/http';
import * as config from '../../../config.js';
import * as header from '../../../buildrequestheaders.js';

//API call to edit the process of an instance
export function putProcess(runtimeToken, partyId, instanceId, processJson) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'process');
  var params = header.buildHearderWithRuntimeandJson(runtimeToken, 'platform');
  var requestBody = JSON.stringify(processJson);
  return http.put(endpoint, requestBody, params);
}

//API call to get the process history of an instance
export function getProcessHistory(runtimeToken, partyId, instanceId) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'process') + '/history';
  var params = header.buildHearderWithRuntime(runtimeToken, 'platform');
  return http.get(endpoint, params);
}
