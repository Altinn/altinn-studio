import http from 'k6/http';
import * as config from '../../config.js';
import * as header from '../../buildrequestheaders.js';
import { httpGet } from '../../wrapper.js';

//Api call to App Api:Data to get a data by id of an app instance and returns response
export function getDataById(altinnStudioRuntimeCookie, partyId, instaceId, dataId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instaceId, dataId, 'dataid');
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return httpGet(endpoint, params);
}

//Function to return the first data id from an instance JSON object
export function findDataId(instanceJson) {
  instanceJson = JSON.parse(instanceJson);
  var dataId = instanceJson.data[0].id;
  return dataId;
}

//Api call to App Api:Data to edit a data by id of an app instance and returns response
export function putDataById(altinnStudioRuntimeCookie, partyId, instaceId, dataId, attachmentType, data, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instaceId, dataId, 'dataid');
  var isBinaryAttachment = typeof data === 'object' ? true : false;
  var params = header.buildHeadersForData(isBinaryAttachment, attachmentType, altinnStudioRuntimeCookie, 'app');
  var requestBody = data;
  return http.put(endpoint, requestBody, params);
}

//Api call to App Api:Data to delete a data by id of an app instance and returns response
export function deleteDataById(altinnStudioRuntimeCookie, partyId, instaceId, dataId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instaceId, dataId, 'dataid');
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.del(endpoint, '', params);
}

//Api call to App Api:Instances to validate an instance data and returns response
export function getValidateInstanceData(altinnStudioRuntimeCookie, partyId, instanceId, dataId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instanceId, dataId, 'dataid') + '/validate';
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.get(endpoint, params);
}

//Api call to App Api:Data to add a data to an app instance and returns response
export function postData(altinnStudioRuntimeCookie, partyId, instaceId, dataType, data, attachmentType, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instaceId, '', 'instanceid') + '/data?dataType=' + dataType;
  var isBinaryAttachment = typeof data === 'object' ? true : false;
  var params = header.buildHeadersForData(isBinaryAttachment, attachmentType, altinnStudioRuntimeCookie, 'app');
  return http.post(endpoint, data, params);
}
