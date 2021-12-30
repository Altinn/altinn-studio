import http from 'k6/http';
import * as config from '../../../config.js';
import * as header from '../../../buildrequestheaders.js';

//Request to get parties that an user can represent and return response
export function getParties(userId) {
  var endpoint = config.platformAuthorization['parties'] + '?userId=' + userId;
  var params = header.buildHeaderWithSubsKey('platform');
  return http.get(endpoint, params);
}

//Request to get roles of an user
export function getRoles(userId, partyId) {
  var endpoint = config.platformAuthorization['roles'] + '?coveredbyuserid=' + userId + '&offeredbypartyid=' + partyId;
  var params = header.buildHeaderWithSubsKey('platform');
  return http.get(endpoint, params);
}

//Request to upload app policy to storage
export function postPolicy(data, appOwner, appName, altinnStudioRuntimeCookie) {
  var endpoint = config.platformAuthorization['policy'] + '?org=' + appOwner + '&app=' + appName;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.post(endpoint, data, params);
}

//Request to get decision from PDP and return response
export function postGetDecision(pdpInputJson, jsonPermitData, appOwner, testappName, userId, partyId, altinnTask) {
  var endpoint = config.platformAuthorization['decision'];
  var pdpJson = buildPdpJson(pdpInputJson, jsonPermitData, appOwner, testappName, userId, partyId, altinnTask);
  var requestBody = JSON.stringify(pdpJson);
  var params = header.buildHeaderWithJson('platform');
  return http.post(endpoint, requestBody, params);
}

//Function to build a json for authz: decision request and returns a json object
function buildPdpJson(pdpInputJson, jsonPermitData, appOwner, testappName, userId, partyId, altinnTask) {
  var action = jsonPermitData['Action'];
  var accessSubject = jsonPermitData['AccessSubject'];
  var resource = jsonPermitData['Resource'];
  pdpInputJson = JSON.parse(pdpInputJson);

  //Loop through action and add to the json input template under Action
  for (var i = 0; i < action.length; i++) {
    var emptyObject = {};
    pdpInputJson.Request.Action[0].Attribute.push(emptyObject);
    pdpInputJson.Request.Action[0].Attribute[i].AttributeId = 'urn:oasis:names:tc:xacml:1.0:action:action-id';
    pdpInputJson.Request.Action[0].Attribute[i].Value = action[i];
    pdpInputJson.Request.Action[0].Attribute[i].DataType = 'http://www.w3.org/2001/XMLSchema#string';
  }

  //Loop through access Subject and add to the json input template under AccessSubject
  for (var i = 0; i < accessSubject.length; i++) {
    var value = '';
    var emptyObject = {};
    pdpInputJson.Request.AccessSubject[0].Attribute.push(emptyObject);
    switch (accessSubject[i]) {
      case 'urn:altinn:org':
        value = appOwner;
        break;
      case 'urn:altinn:userid':
        value = userId;
        break;
    }
    pdpInputJson.Request.AccessSubject[0].Attribute[i].AttributeId = accessSubject[i];
    pdpInputJson.Request.AccessSubject[0].Attribute[i].Value = value;
  }

  //Loop through Resource array and add to the json input template under resources
  for (var i = 0; i < resource.length; i++) {
    var value = '';
    var emptyObject = {};
    pdpInputJson.Request.Resource[0].Attribute.push(emptyObject);
    switch (resource[i]) {
      case 'urn:altinn:org':
        value = appOwner;
        break;
      case 'urn:altinn:userid':
        value = userId;
        break;
      case 'urn:altinn:app':
        value = testappName;
        break;
      case 'urn:altinn:partyid':
        value = partyId;
        break;
      case 'urn:altinn:task':
        value = altinnTask;
        break;
      case 'urn:altinn:appresource':
        value = 'events';
        break;
    }
    pdpInputJson.Request.Resource[0].Attribute[i].AttributeId = resource[i];
    pdpInputJson.Request.Resource[0].Attribute[i].Value = value;
  }
  return pdpInputJson;
}
