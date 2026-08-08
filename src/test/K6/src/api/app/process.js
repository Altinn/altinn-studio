import http from 'k6/http';
import * as config from '../../config.js';
import * as header from '../../buildrequestheaders.js';

//Api call to App Api:Process to start process of an app instance and returns response
export function postStartProcess(altinnStudioRuntimeCookie, partyId, instanceId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instanceId, '', 'process') + '/start';
  var params = header.buildHeaderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.post(endpoint, null, params);
}

//Api call to App Api:Process to move process of an app instance to a specific process element if sent of next task in process and returns response
export function putNextProcess(altinnStudioRuntimeCookie, partyId, instanceId, processElement, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instanceId, '', 'process');
  endpoint += processElement != null ? '/next?elementId=' + processElement : '/next';
  var params = header.buildHeaderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.put(endpoint, null, params);
}

//Api call to App Api:Process to GET current process of an app instance and returns response
export function getCurrentProcess(altinnStudioRuntimeCookie, partyId, instanceId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instanceId, '', 'process');
  var params = header.buildHeaderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.get(endpoint, params);
}

//Api call to App Api:Process to GET next process of an app instance and returns response
export function getNextProcess(altinnStudioRuntimeCookie, partyId, instanceId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instanceId, '', 'process') + '/next';
  var params = header.buildHeaderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.get(endpoint, params);
}

//Api call to App Api:Process to GET process history of an app instance and returns response
export function getProcessHistory(altinnStudioRuntimeCookie, partyId, instanceId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instanceId, '', 'process') + '/history';
  var params = header.buildHeaderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.get(endpoint, params);
}

/**
 * Api call to App Api:Process to complete the instance process and returns response
 * @param {*} altinnStudioRuntimeCookie token to authenticate the api request
 * @param {*} partyId partyid of the user
 * @param {*} instanceId instance guid
 * @param {*} appOwner name of the app owner
 * @param {*} appName name of the app to which the instance belongs
 * @returns {JSON} response body, headers and timings
 */
export function putCompleteProcess(altinnStudioRuntimeCookie, partyId, instanceId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instanceId, '', 'completeprocess');
  var params = header.buildHeaderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.put(endpoint, null, params);
}
