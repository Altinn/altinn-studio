import http from 'k6/http';
import * as config from '../../../config.js';
import * as header from '../../../buildrequestheaders.js';
import { stopIterationOnFail } from '../../../errorcounter.js';
import * as support from '../../../support.js';

/**
 * Api call to Storage:Instances to create an app instance and returns response
 * @param {*} altinnStudioRuntimeCookie token value to be sent in header for authentication
 * @param {*} partyId party id of the user to whom instance is to be created
 * @param {*} appOwner app owner name
 * @param {*} appName app name
 * @param {JSON} instanceJson instance json metadata sent in request body
 * @returns {JSON} Json object including response headers, body, timings
 */
export function postInstance(altinnStudioRuntimeCookie, partyId, appOwner, appName, instanceJson) {
  var appId = appOwner + '/' + appName;
  var endpoint = config.platformStorage['instances'] + '?appId=' + appId;
  var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie, 'platform');
  var requestbody = JSON.stringify(buildInstanceInputJson(instanceJson, appId, partyId));
  return http.post(endpoint, requestbody, params);
}

//Function to build input json for creation of instance with app, instanceOwner details and returns a JSON object
function buildInstanceInputJson(instanceJson, appId, partyId) {
  instanceJson = JSON.parse(instanceJson);
  instanceJson.instanceOwner.partyId = partyId;
  instanceJson.appId = appId;
  return instanceJson;
}

//Api call to Storage:Instances to get an instance by id and return response
export function getInstanceById(altinnStudioRuntimeCookie, partyId, instanceId) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'instanceid');
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}

//Api call to Storage:Instances to get all instances under a party id and return response
export function getAllinstancesWithFilters(altinnStudioRuntimeCookie, filters) {
  var endpoint = config.platformStorage['instances'];
  endpoint += filters != null ? support.buildQueryParametersForEndpoint(filters) : '';
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}

//Api call to Storage:Instances to get all archived instances under an app created after a specific date and return response
export function getArchivedInstancesByOrgAndApp(altinnStudioRuntimeCookie, appOwner, appName, isArchived, createdDateTime) {
  //If createdDateTime is not sent update the value to today's date
  if (!createdDateTime) {
    createdDateTime = support.todayDateInISO();
  }
  var filters = {
    created: `gt:${createdDateTime}`,
    org: appOwner,
    appId: `${appOwner}/${appName}`,
    'process.isComplete': isArchived,
  };

  //find archived instances of the app that has created date > createdDateTime
  var endpoint = config.platformStorage['instances'] + support.buildQueryParametersForEndpoint(filters);
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}

//Function to clip out the instance owner id and return only instance id
export function findInstanceId(responseBody) {
  try {
    var instanceId = JSON.parse(responseBody).id;
    instanceId = instanceId.split('/');
    instanceId = instanceId[1];
    return instanceId;
  } catch (error) {
    stopIterationOnFail('Instance id cannot be retrieved:', false, null);
  }
}

//Function to find all the archived app instances created after specific created date time for an appOwner for a specific app and returns instance id as an array
export function findAllArchivedInstances(altinnStudioRuntimeCookie, appOwner, appName, count, createdDateTime) {
  var allInstances = getArchivedInstancesByOrgAndApp(altinnStudioRuntimeCookie, appOwner, appName, 'true', createdDateTime);
  var params = header.buildHeaderWithRuntimeAsCookie(altinnStudioRuntimeCookie, 'platform');
  params.timeout = 120000;
  allInstances = JSON.parse(allInstances.body);
  let archivedInstances = buildArrayWithInstanceIds(allInstances.instances);
  while (allInstances.next !== null) {
    if (archivedInstances.length >= count) {
      break; // exit loop if the archivedInstances array length is more than required count (total iterations)
    }
    allInstances = http.get(allInstances.next, params);
    if (allInstances.status != 200) {
      stopIterationOnFail('Get all instances failed:', false, allInstances);
    }
    allInstances = JSON.parse(allInstances.body);
    var moreInstances = buildArrayWithInstanceIds(allInstances.instances);
    archivedInstances = archivedInstances.concat(moreInstances);
  }
  return archivedInstances;
}

//Function to build an array with instances that are not deleted from an json response
function findArchivedNotDeltedInstances(instancesArray) {
  var archivedInstances = [];
  for (var i = 0; i < instancesArray.length; i++) {
    if (!('softDeleted' in instancesArray[i].status)) {
      archivedInstances.push(instancesArray[i].id);
    }
  }
  return archivedInstances;
}

//Function to build an array with instance id from instances json response
function buildArrayWithInstanceIds(instancesArray) {
  var instanceIds = [];
  for (var i = 0; i < instancesArray.length; i++) {
    instanceIds.push(instancesArray[i].id);
  }
  return instanceIds;
}

//API call to platform:storage to completeconfirmation on the instance by an appOwner
export function postCompleteConfirmation(altinnStudioRuntimeCookie, partyId, instanceId) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'completeconfirmation');
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.post(endpoint, null, params);
}

//Api call to Storage:Instances to soft/hard delete an instance by id and return response
export function deleteInstanceById(altinnStudioRuntimeCookie, partyId, instanceId, hardDelete) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'instanceid') + '?hard=' + hardDelete;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.del(endpoint, null, params);
}

//Api call to Storage:Instances to update the read status to: Unread, Read, UpdatedSinceLastReview
//an instance by id and return response
export function putUpdateReadStatus(altinnStudioRuntimeCookie, partyId, instanceId, readStatus) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'readstatus') + '?status=' + readStatus;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.put(endpoint, null, params);
}

//Function to find all the archived hard deleted, not complete confirmed app instances created after specific created date time for an appOwner for a specific app and returns instance id as an array
export function findAllHardDeletedInstances(altinnStudioRuntimeCookie, appOwner, appName, createdDateTime) {
  var allInstances = getArchivedInstancesByOrgAndApp(altinnStudioRuntimeCookie, appOwner, appName, 'true', createdDateTime);
  var params = header.buildHeaderWithRuntimeAsCookie(altinnStudioRuntimeCookie, 'platform');
  params.timeout = 120000;
  allInstances = JSON.parse(allInstances.body);
  var harDeletedinstances = buildArrayWithHardDeletedInstanceIds(allInstances.instances);

  while (allInstances.next !== null) {
    allInstances = http.get(allInstances.next, params);
    if (allInstances.status != 200) {
      stopIterationOnFail('Get all instances failed:', false, allInstances);
    }
    allInstances = JSON.parse(allInstances.body);
    var moreInstances = buildArrayWithHardDeletedInstanceIds(allInstances.instances);
    harDeletedinstances = harDeletedinstances.concat(moreInstances);
  }

  harDeletedinstances = harDeletedinstances.length > 0 ? harDeletedinstances : [];
  return harDeletedinstances;
}

//Function to build an array with instances that are hard deleted and not complete confirmed from an json response
function buildArrayWithHardDeletedInstanceIds(instancesArray) {
  var harDeletedInstances = [];
  for (var i = 0; i < instancesArray.length; i++) {
    if ('status' in instancesArray[i] && 'hardDeleted' in instancesArray[i].status) {
      if (!('completeConfirmations' in instancesArray[i]) || instancesArray[i].completeConfirmations == null) {
        harDeletedInstances.push(instancesArray[i].id);
      }
    }
  }
  return harDeletedInstances;
}

//Api call to Storage:Instances to update the sub status of an instance and return response
export function putUpdateSubStatus(altinnStudioRuntimeCookie, partyId, instanceId, statusLabel, statusDescription) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'substatus');
  var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie, 'platform');
  var requestBody = JSON.parse('{}');
  requestBody.label = statusLabel;
  requestBody.description = statusDescription;
  requestBody = JSON.stringify(requestBody);
  return http.put(endpoint, requestBody, params);
}
