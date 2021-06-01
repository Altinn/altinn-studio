import http from 'k6/http';
import * as config from '../../../config.js';
import * as header from '../../../buildrequestheaders.js';

//Api call to Platform:Storage to upload a data to an instance and returns the response
export function postData(altinnStudioRuntimeCookie, partyId, instanceId, dataType, instanceData) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'instanceid') + '/data?dataType=' + dataType;
  var isBinaryAttachment = typeof data === 'object' ? true : false;
  var params = header.buildHeadersForData(isBinaryAttachment, altinnStudioRuntimeCookie, 'platform');
  return http.post(endpoint, instanceData, params);
}

//Api call to Platform:Storage to upload a data to an instance and returns the response
export function putData(altinnStudioRuntimeCookie, partyId, instanceId, dataId, dataType, instanceData) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, dataId, 'dataid');
  var isBinaryAttachment = typeof data === 'object' ? true : false;
  var params = header.buildHeadersForData(isBinaryAttachment, altinnStudioRuntimeCookie, 'platform');
  return http.put(endpoint, instanceData, params);
}

//Api call to Platform:Storage to get a data by id of an instance and returns the response
export function getData(altinnStudioRuntimeCookie, partyId, instanceId, dataId) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, dataId, 'dataid');
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}

//Api call to Platform:Storage to get all dataelements of an instance and returns the response
export function getAllDataElements(altinnStudioRuntimeCookie, partyId, instanceId) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'dataelements');
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}

//Api call to Platform:Storage to delete a data by id from an instance and returns the response
export function deleteData(altinnStudioRuntimeCookie, partyId, instanceId, dataId) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, dataId, 'dataid');
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.del(endpoint, null, params);
}
