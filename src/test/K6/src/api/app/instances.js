import http from 'k6/http';
import * as config from '../../config.js';
import * as header from '../../buildrequestheaders.js';
import { httpPost } from '../../wrapper.js';

//Api call to App Api:Instances to create an app instance and returns response
export function postInstance(altinnStudioRuntimeCookie, partyId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + '/instances?instanceOwnerPartyId=' + partyId;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.post(endpoint, null, params);
}

//Api call to App Api:Instances to create an app instance and returns response
export function getInstanceById(altinnStudioRuntimeCookie, partyId, instanceId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instanceId, '', 'instanceid');
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.get(endpoint, params);
}

//Api call to App Api:Instances to validate an app instance and returns response
export function getValidateInstance(altinnStudioRuntimeCookie, partyId, instanceId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instanceId, '', 'instanceid') + '/validate';
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.get(endpoint, params);
}

//Api call to App Api:Instances to create an app instance based on user ssn or organisation number and returns response
export function postCreateInstanceWithSsnOrOrg(altinnStudioRuntimeCookie, userType, value, appOwner, appName) {
  var requestBody = '{"instanceOwner":{}}';
  requestBody = JSON.parse(requestBody);
  var endpoint = config.appApiBaseUrl(appOwner, appName) + '/instances';
  var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie, 'app');
  if (userType == 'ssn') {
    requestBody.instanceOwner.personNumber = value;
  } else if (userType == 'org') {
    requestBody.instanceOwner.organisationNumber = value;
  }
  requestBody = JSON.stringify(requestBody);
  return http.post(endpoint, requestBody, params);
}

//Function that loops through instance data metadata and returns true if metadata for receipt pdf is present
export function isReceiptPdfGenerated(responseJson) {
  responseJson = JSON.parse(responseJson);
  for (var i = 0; i < responseJson.data.length; i++) {
    if (responseJson.data[i].dataType == 'ref-data-as-pdf') return true;
  }
}

//Api call to update the sub status of an app instance and return the response
export function putUpdateSubStatus(altinnStudioRuntimeCookie, partyId, instanceId, appOwner, appName, statusLabel, statusDescription) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instanceId, '', 'substatus');
  var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie, 'app');
  var requestBody = JSON.parse('{}');
  requestBody.label = statusLabel;
  requestBody.description = statusDescription;
  requestBody = JSON.stringify(requestBody);
  return http.put(endpoint, requestBody, params);
}

//Api call to mark an app instance as complete confirmed by app owner and return the response
export function postCompleteConfirmation(altinnStudioRuntimeCookie, partyId, instanceId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instanceId, '', 'complete');
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.post(endpoint, null, params);
}

/**
 * Api call to App Api:Instances to create an app instance for a party with multipart data including form data xml and returns response
 * @param {*} altinnStudioRuntimeCookie token to authenticate the api request
 * @param {*} partyId partyid of the user to create an instance
 * @param {*} appOwner name of the app owner
 * @param {*} appName name of the app
 * @param {XMLDocument} formDataXml xml form data
 */
export function postInstanceWithMultipartData(altinnStudioRuntimeCookie, partyId, appOwner, appName, formDataXml) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + '/instances';
  var params = header.buildHearderWithRuntimeForMultipart(altinnStudioRuntimeCookie, 'app');

  var instanceJson = {
    instanceOwner: {
      partyId: partyId,
    },
  };
  instanceJson = JSON.stringify(instanceJson);

  var requestBody =
    `--abcdefg\r\n` +
    `Content-Type: application/json; charset=utf-8\r\n` +
    `Content-Disposition: form-data; name=\"instance\"\r\n\r\n${instanceJson}\r\n\r\n` +
    `--abcdefg\r\n` +
    `Content-Type: application/xml\r\n` +
    `Content-Disposition: form-data; name=\"default\"\r\n\r\n${formDataXml}\r\n\r\n` +
    `--abcdefg--`;

  return httpPost(endpoint, requestBody, params);
}

/**
 * Get an array on active instances of an app for a party id
 * @param {*} altinnToken token to authenticate the api request
 * @param {*} partyId partyid of an user
 * @param {*} appOwner name of the app owner
 * @param {*} appName name of the app
 * @returns response of the http get request
 */
export function getActiveInstances(altinnToken, partyId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, null, null, 'active');
  var params = header.buildHearderWithRuntime(altinnToken, 'app');
  return http.get(endpoint, params);
}
