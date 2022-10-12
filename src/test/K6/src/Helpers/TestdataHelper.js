import { check, sleep } from 'k6';
import { addErrorCount, stopIterationOnFail } from '../errorcounter.js';
import * as delegation from '../api/platform/authorization/delegations.js';
import * as authorization from '../api/platform/authorization/authorization.js';
import * as setUpData from '../setup.js';

let pdpInputJson = open('../data/pdpinput.json');

/**
 * Helper function to quickly add rules for testing purposes
 * @param {*} performedByUserId The userId of the person who performed the delegation
 * @param {*} offeredByPartyId  The partyId of the user/org giving the rule
 * @param {*} coveredBy the userid/partyid of the user/org receiving the rule
 * @param {*} coveredByType 'userid' for users, 'partyid' for organizations
 * @param {*} taskName 'Task_1', 'EndEvent_1'
 * @param {*} actionName 'read', 'write', 'sign'
 * @returns the ruleid for the newly added rule
 */
 export function addRulesForTest(altinnToken, performedByUserId, offeredByPartyId, coveredBy, coveredByType, taskName, actionName, appOwner, appName) {
  var policyMatchKeys = {
    coveredBy: 'urn:altinn:' + coveredByType,
    resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:task'],
  };
  
  var res = delegation.addRules(altinnToken, policyMatchKeys, performedByUserId, offeredByPartyId, coveredBy, appOwner, appName, taskName, actionName);
  
  // Assert
  var success = check(res, {
    'Add delegation rule - status is 201': (r) => r.status === 201,
  });
  addErrorCount(success);
  stopIterationOnFail('Add delegation rule Failed', success, res);
  sleep(3);

  return res.json('0.ruleId');
}

/**
 * Helper function to quickly add rules for testing purposes
 * @param {*} delegatedByUserId The userId of the person who performed the delegation
 * @param {*} offeredByPartyId  The partyId of the user/org giving the rule
 * @param {*} coveredBy the userid/partyid of the user/org receiving the rule
 * @param {*} coveredByType 'userid' for users, 'partyid' for organizations
 * @param {*} taskName 'Task_1', 'EndEvent_1'
 * @param {*} actionName 'read', 'write', 'sign'
 * @returns the object used to generate policy match in addMultipleRules
 */
 export function generateDataForAddMultipleRules(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, taskName, actionName, appOwnerIn=appOwner, appNameIn=appName) {
  var policyMatchKeys = {
    coveredBy: 'urn:altinn:' + coveredByType,
    resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:task'],
  };

  return {
    policyMatchKeys: policyMatchKeys,
    delegatedByUserId: delegatedByUserId,
    offeredByPartyId: offeredByPartyId,
    coveredBy: coveredBy,
    appOwner: appOwnerIn,
    appName: appNameIn,
    altinnTask: taskName,
    altinnAction: actionName
  };
}

/**
 * Helper function for quickly checking whether the PDP's decision is 'permit' or something else
 * @param {*} offeredByPartyId The partyid in the Resource
 * @param {*} coveredBy  The AccessSubject's userid/partyid
 * @param {*} taskName 'Task_1', 'EndEvent_1'
 * @param {*} actionName 'read', 'write', 'sign'
 * @param {*} expectedDecision 'Permit', 'NotApplicable'
 */
export function checkPDPDecision(offeredByPartyId, coveredBy, taskName, actionName, expectedDecision, showResults, appOwner, appName) {
  var jsonPermitData = {
    AccessSubject: ['urn:altinn:userid'],
    Action: [actionName],
    Resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:partyid', 'urn:altinn:task'],
  };
  var res = authorization.postGetDecision(pdpInputJson, jsonPermitData, appOwner, appName, coveredBy, offeredByPartyId, taskName);

  // Assert
  var success = check(res, {
    'Get PDP Decision for delegated rule Status is 200': (r) => r.status === 200,
    'Get PDP Decision for delegated rule - decision is permit': (r) => r.json('response.0.decision') === expectedDecision,
  });

  if(!success && showResults) {
    console.log('Expected decision to be ' + expectedDecision + ', but it was not.');
  }

  // console.log('Decision was ' + expectedDecision + ', as expected.');
  addErrorCount(success);
  return success;
}

/**
 * Helper function that deletes all rules as a cleanup step before/after a test
 * @param {*} performedByUserId The userId of the user who does the deleting
 * @param {*} offeredByPartyId The partyid of the organization the rule is delegated from
 * @param {*} coveredBy The userid/partyid of the user/org the rule is delegated to
 * @param {*} coveredByType 'userid' for user, 'partyid' for organization
 * @param {*} ignoreErrors If true, the entire check/assert part is skipped
 */
export function deleteAllRules(altinnToken, performedByUserId, offeredByPartyId, coveredBy, coveredByType, appOwner, appName) {
  var policyMatchKeys = {
    coveredBy: 'urn:altinn:' + coveredByType,
    resource: ['urn:altinn:app', 'urn:altinn:org'],
  };
  var resources = [{ appOwner: appOwner, appName: appName }];

  var res = delegation.getRules(altinnToken, policyMatchKeys, offeredByPartyId, coveredBy, resources, null, null);
  if (res.body == '[]') {
    return;
  }

  res = delegation.deletePolicy(altinnToken, policyMatchKeys, performedByUserId, offeredByPartyId, coveredBy, appOwner, appName, null);  
  var success = check(res, {
    'Delete delegated policy with all rules - status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);
  sleep(3);
  
}

export function minimumSBLVersion(major, minor) {
  var altinnBuildVersion = setUpData.getSBLBuildVersion(); 
  if (altinnBuildVersion.split('.')[0] >= major && altinnBuildVersion.split('.')[1] >= minor) {
    return true;
  }
  return false;
}