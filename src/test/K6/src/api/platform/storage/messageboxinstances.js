import http from 'k6/http';
import * as config from '../../../config.js';
import * as header from '../../../buildrequestheaders.js';
import * as support from '../../../support.js';

//Api call to Storage:SBL instances to get an instance by id and return response
export function getSblInstanceById(altinnStudioRuntimeCookie, partyId, instanceId) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'sblinstanceid');
  var params = header.buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}

//Api call to Storage:SBL instances to get an instance by id and return response
export function deleteSblInstance(altinnStudioRuntimeCookie, partyId, instanceId, hardDelete) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'sblinstanceid') + '?hard=' + hardDelete;
  var params = header.buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, 'platform');
  return http.del(endpoint, '', params);
}

//Api call to Storage:SBL instances to restore a soft deleted instance
export function restoreSblInstance(altinnStudioRuntimeCookie, partyId, instanceId) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'sblinstanceid') + '/undelete';
  var params = header.buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, 'platform');
  return http.put(endpoint, '', params);
}

//Api call to Storage:SBL instances to get an instance by id and return response
export function getSblInstanceEvents(altinnStudioRuntimeCookie, partyId, instanceId) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'sblinstanceid') + '/events';
  var params = header.buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}

//Function to hard delete all instances that is passed into the function
export function hardDeleteManyInstances(altinnStudioRuntimeCookie, instances) {
  for (var i = 0; i < instances.length; i++) {
    var instanceIdSplit = instances[i].split('/');
    var partyId = instanceIdSplit[0];
    var instanceId = instanceIdSplit[1];
    deleteSblInstance(altinnStudioRuntimeCookie, partyId, instanceId, 'true');
  }
}

//Function to filter app instances based on appName and return instances as an array
export function filterInstancesByAppName(appNames, responseJson) {
  responseJson = JSON.parse(responseJson);
  var instances = [];
  for (var i = 0; i < responseJson.length; i++) {
    if (appNames.includes(responseJson[i].appName)) {
      instances.push(responseJson[i].instanceOwnerId + '/' + responseJson[i].id);
    }
  }
  return instances;
}

/**
 * Api call to Storage:SBL to search for instances based on filter parameters
 * @param {JSON} filters a JSON object with filters in keyvalue pairs
 * @example {"key1": "value1", "key2": "value2"}
 * @returns {JSON} response body, code and timings
 */
export function searchSblInstances(altinnStudioRuntimeCookie, filters) {
  var endpoint = config.platformStorage['messageBoxInstances'] + '/search' + support.buildQueryParametersForEndpoint(filters);
  var params = header.buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}
