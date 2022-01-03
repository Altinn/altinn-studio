import http from 'k6/http';
import * as config from '../../../config.js';
import * as header from '../../../buildrequestheaders.js';

/**
 * Retrieve policy of an app in json format
 * @param {*} altinnToken authorization token
 * @param {*} appOwner
 * @param {*} appName
 * @returns return response of GET request
 */
export function getPolicies(appOwner, appName) {
  var endpoint = config.platformAuthorization.getPolicies;
  var params = header.buildHeaderWithJson('platform');
  var body = [
    [
      {
        id: 'urn:altinn:org',
        value: appOwner,
      },
      {
        id: 'urn:altinn:app',
        value: appName,
      },
    ],
  ];
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
 * @param {*} appOwner
 * @param {*} appName
 * @param {*} altinnTask Task_1, EndEvent_1
 * @returns response of the POST request
 */
export function getRules(altinnToken, policyMatchKeys, offeredByPartyId, coveredById, appOwner, appName, altinnTask) {
  var endpoint = config.platformAuthorization.getRules;
  var params = header.buildHearderWithRuntimeandJson(altinnToken, 'platform');
  var body = {};
  body.policyMatches = [];
  body.policyMatches.push(generatePolicyMatch(policyMatchKeys, null, offeredByPartyId, coveredById, appOwner, appName, altinnTask, null));
  body.keyRolePartyIds = [];
  return http.post(endpoint, JSON.stringify(body), params);
}

/**
 * POSt call to delete a delegated rule based on rule id
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
    resource: [],
  };
  var coveredBy = policyMatchKeys['coveredBy'];
  var resources = policyMatchKeys['resource'];

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

  for (var i = 0; i < resources.length; i++) {
    var value = '';
    policyMatch.resource.push({});
    switch (resources[i]) {
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
    policyMatch.resource[i].id = resources[i];
    policyMatch.resource[i].value = value;
  }

  return policyMatch;
}
