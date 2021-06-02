import http from 'k6/http';
import * as config from '../../config.js';
import * as header from '../../buildrequestheaders.js';

/**
 * API call to stateless data that creates a new data object of the defined data type
 * @param {string} altinnStudioRuntimeCookie
 * @param {string} dataType
 * @param {string} appOwner
 * @param {string} appName
 * @returns reponse of http post call
 */
export function postData(altinnStudioRuntimeCookie, dataType, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.statelessdata + '?dataType=' + dataType;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.post(endpoint, null, params);
}

/**
 * API call to stateless data runs calculations on the provided data object of the defined defined data type
 * @param {string} altinnStudioRuntimeCookie
 * @param {string} dataType
 * @param {XMLDocument} data
 * @param {string} appOwner
 * @param {string} appName
 * @returns reponse of http put call
 */
export function putDataByType(altinnStudioRuntimeCookie, dataType, data, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.statelessdata + '?dataType=' + dataType;
  var params = header.buildHeadersForData(false, altinnStudioRuntimeCookie, 'app');
  var requestBody = data;
  return http.put(endpoint, requestBody, params);
}
