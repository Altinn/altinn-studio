import http from 'k6/http';
import * as config from '../../../config.js';
import * as header from '../../../buildrequestheaders.js';

/**
 * Retrieve policy of an app in json format
 * @param {*} altinnToken authorization token
 * @param {Array} resources [{ appOwner: ttd, appName: apps-test }]
 * @returns return response of GET request
 */
export function getPolicies(resources) {
  var endpoint = config.platformAuthorization.getPolicies;
  var params = header.buildHeaderWithJson('platform');
  var body = [];
  resources.forEach((resource) => {
    var appOwner = resource.appOwner ? resource.appOwner : null;
    var appName = resource.appName ? resource.appName : null;
    body.push(buildResourcesArray(['urn:altinn:app', 'urn:altinn:org'], appOwner, appName, null));
  });
  return http.post(endpoint, JSON.stringify(body), params);
}

/**
 * POST api call to add a rule that delagates access to an user
 * @param {*} altinnToken token for authorizing the request
 * @param {*} policyMatchKeys keys to be populated in the request
 * @param {*} delegatedByUserId user id of the user who delegates the rule
 * @param {*} offeredByPartyId party id of the user who offers the rule
 * @param {*} coveredById user id or party id of whom that receives the rule
 * @param {*} appOwner
 * @param {*} appName
 * @param {*} altinnTask Task_1, EndEvent_1
 * @param {*} altinnAction read,write,sign
 * @returns response of the POST request
 */
export function addRules(altinnToken, policyMatchKeys, delegatedByUserId, offeredByPartyId, coveredById, appOwner, appName, altinnTask, altinnAction) {
  var endpoint = config.platformAuthorization.addRules;
  var params = header.buildHearderWithRuntimeandJson(altinnToken, 'platform');
  var body = [];
  body.push(generatePolicyMatch(policyMatchKeys, delegatedByUserId, offeredByPartyId, coveredById, appOwner, appName, altinnTask, altinnAction));
  return http.post(endpoint, JSON.stringify(body), params);
}

/**
 * POST call to get rules matching a criteria
 * @param {*} altinnToken token for authorizing the request
 * @param {*} policyMatchKeys keys to be populated in the request
 * @param {*} offeredByPartyId party id of the user who offers the rule
 * @param {*} coveredById user id or party id of whom that receives the rule
 * @param {Array} resources [{ appOwner: ttd, appName: apps-test }]
 * @returns response of the POST request
 */
export function getRules(altinnToken, policyMatchKeys, offeredByPartyId, coveredById, resources) {
  var endpoint = config.platformAuthorization.getRules;
  var params = header.buildHearderWithRuntimeandJson(altinnToken, 'platform');

  var body = { coveredBy: [], resources: [] };
  if (offeredByPartyId) body.offeredByPartyId = offeredByPartyId;

  var coveredBy = policyMatchKeys['coveredBy'];
  if (coveredById && coveredBy) {
    body.coveredBy.push({});
    body.coveredBy[0].id = coveredBy;
    body.coveredBy[0].value = coveredById.toString();
  }

  resources.forEach((resource) => {
    var appOwner = resource.appOwner ? resource.appOwner : null;
    var appName = resource.appName ? resource.appName : null;
    var altinnTask = resource.altinnTask ? resource.altinnTask : null;
    body.resources.push(buildResourcesArray(policyMatchKeys['resource'], appOwner, appName, altinnTask));
  });

  body.keyRolePartyIds = [];

  return http.post(endpoint, JSON.stringify(body), params);
}

/**
 * Post call to delete a delegated rule based on rule id
 * @param {*} altinnToken token for authorizing the request
 * @param {*} policyMatchKeys keys to be populated in the request
 * @param {Array} ruleIds an array of guids
 * @param {*} deletedByUserId user who deletes the rule
 * @param {*} offeredByPartyId party id of the user who offers the rule
 * @param {*} coveredById user id or party id of whom that receives the rule
 * @param {*} appOwner
 * @param {*} appName
 * @param {*} altinnTask Task_1, EndEvent_1
 * @param {*} altinnAction read,write,sign
 * @returns  response of the POST request
 */
export function deleteRules(
  altinnToken,
  policyMatchKeys,
  ruleIds,
  deletedByUserId,
  offeredByPartyId,
  coveredById,
  appOwner,
  appName,
  altinnTask,
  altinnAction,
) {
  var endpoint = config.platformAuthorization.deleteRules;
  var params = header.buildHearderWithRuntimeandJson(altinnToken, 'platform');
  var body = [{}];
  body[0].policyMatch = generatePolicyMatch(policyMatchKeys, null, offeredByPartyId, coveredById, appOwner, appName, altinnTask, altinnAction);
  body[0].ruleIds = ruleIds;
  body[0].deletedByUserId = deletedByUserId;
  return http.post(endpoint, JSON.stringify(body), params);
}

/**
 * Post call to delete the complete policy wit all rules
 * @param {*} altinnToken token for authorizing the request
 * @param {*} policyMatchKeys keys to be populated in the request
 * @param {*} deletedByUserId user who deletes the policy
 * @param {*} offeredByPartyId party id of the user who offers the rule
 * @param {*} coveredById user id or party id of whom that receives the rule
 * @param {*} appOwner
 * @param {*} appName
 * @param {*} altinnTask Task_1, EndEvent_1
 * @returns response of the POST request
 */
export function deletePolicy(altinnToken, policyMatchKeys, deletedByUserId, offeredByPartyId, coveredById, appOwner, appName, altinnTask) {
  var endpoint = config.platformAuthorization.deletePolicy;
  var params = header.buildHearderWithRuntimeandJson(altinnToken, 'platform');
  var body = [{}];
  body[0].policyMatch = generatePolicyMatch(policyMatchKeys, null, offeredByPartyId, coveredById, appOwner, appName, altinnTask, null);
  body[0].deletedByUserId = deletedByUserId;
  return http.post(endpoint, JSON.stringify(body), params);
}

/**
 * function to build a policy match with action, user and resource details
 * @param {*} policyMatch Template
 * @param {*} policyMatchKeys keys to be populated in policy match
 * @param {*} delegatedByUserId user id of the user who delegates the rule
 * @param {*} offeredByPartyId party id of the user who offers the rule
 * @param {*} coveredById user id or party id of whom that receives the rule
 * @param {*} appOwner
 * @param {*} appName
 * @param {*} altinnTask Task_1, EndEvent_1
 * @param {*} altinnAction read,write,sign
 * @returns json object of a completed policy match
 */
function generatePolicyMatch(policyMatchKeys, delegatedByUserId, offeredByPartyId, coveredById, appOwner, appName, altinnTask, altinnAction) {
  var policyMatch = {
    coveredBy: [],
  };
  var coveredBy = policyMatchKeys['coveredBy'];
  var resourceKeys = policyMatchKeys['resource'];

  if (coveredById && coveredBy) {
    policyMatch.coveredBy.push({});
    policyMatch.coveredBy[0].id = coveredBy;
    policyMatch.coveredBy[0].value = coveredById.toString();
  }

  if (altinnAction) {
    policyMatch.action = {};
    policyMatch.action.id = 'urn:oasis:names:tc:xacml:1.0:action:action-id';
    policyMatch.action.value = altinnAction;
  }

  if (delegatedByUserId) policyMatch.delegatedByUserId = delegatedByUserId;
  if (offeredByPartyId) policyMatch.offeredByPartyId = offeredByPartyId;

  policyMatch.resource = buildResourcesArray(resourceKeys, appOwner, appName, altinnTask);

  return policyMatch;
}

/**
 * build an array with resource key and value
 * @param {*} resourceKeys ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:partyid', 'urn:altinn:task'],
 * @param {*} appOwner
 * @param {*} appName
 * @param {*} altinnTask
 * @returns an array of resource
 */
function buildResourcesArray(resourceKeys, appOwner, appName, altinnTask) {
  var resource = [];
  for (var i = 0; i < resourceKeys.length; i++) {
    var value = '';
    resource.push({});
    switch (resourceKeys[i]) {
      case 'urn:altinn:org':
        value = appOwner;
        break;
      case 'urn:altinn:app':
        value = appName;
        break;
      case 'urn:altinn:task':
        value = altinnTask;
        break;
      case 'urn:altinn:appresource':
        value = 'events';
        break;
    }
    resource[i].id = resourceKeys[i];
    resource[i].value = value;
  }
  return resource;
}
