import http from 'k6/http';
import * as config from '../../config.js';
import * as header from '../../buildrequestheaders.js';

//Api call to App Api:Process to start process of an app instance and returns response
export function postStartProcess(altinnStudioRuntimeCookie, partyId, instaceId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instaceId, '', 'process') + '/start';
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.post(endpoint, null, params);
}

//Api call to App Api:Process to move process of an app instance to a specific process element if sent of next task in process and returns response
export function putNextProcess(altinnStudioRuntimeCookie, partyId, instaceId, processElement, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instaceId, '', 'process');
  endpoint += processElement != null ? '/next?elementId=' + processElement : '/next';
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.put(endpoint, null, params);
}

//Api call to App Api:Process to GET current process of an app instance and returns response
export function getCurrentProcess(altinnStudioRuntimeCookie, partyId, instaceId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instaceId, '', 'process');
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.get(endpoint, params);
}

//Api call to App Api:Process to GET next process of an app instance and returns response
export function getNextProcess(altinnStudioRuntimeCookie, partyId, instaceId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instaceId, '', 'process') + '/next';
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.get(endpoint, params);
}

//Api call to App Api:Process to GET process history of an app instance and returns response
export function getProcessHistory(altinnStudioRuntimeCookie, partyId, instaceId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instaceId, '', 'process') + '/history';
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.get(endpoint, params);
}

/**
 * Api call to App Api:Process to complete the instance process and returns response
 * @param {*} altinnStudioRuntimeCookie token to authenticate the api request
 * @param {*} partyId partyid of the user
 * @param {*} instaceId instance guid
 * @param {*} appOwner name of the app owner
 * @param {*} appName name of the app to which the instance belongs
 * @returns {JSON} response body, headers and timings
 */
export function putCompleteProcess(altinnStudioRuntimeCookie, partyId, instaceId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instaceId, '', 'completeprocess');
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.put(endpoint, null, params);
}
