/*
  Test data required: deployed app (reference app: ttd/apps-test)
  Username and password for a user with the DAGL role for an organization (user1 and user2)
  Org number for user2's org
  Command: docker-compose run k6 run /src/tests/platform/authorization/delegations/delegationsv2.js 
  -e env=*** -e org=*** -e app=*** -e tokengenuser=*** -e tokengenuserpwd=*** -e appsaccesskey=*** 
  -e user1name=*** -e user1pwd=*** -e user2name=*** -e user2pwd=*** -e user2orgno=***
  -e showresults=***

*/
import { check, sleep, fail } from 'k6';
import { addErrorCount, stopIterationOnFail } from '../../../../errorcounter.js';
import { generateToken } from '../../../../api/altinn-testtools/token-generator.js';
import { generateJUnitXML, reportPath } from '../../../../report.js';
import * as delegation from '../../../../api/platform/authorization/delegations.js';
import * as authorization from '../../../../api/platform/authorization/authorization.js';
import * as setUpData from '../../../../setup.js';
import * as helper from '../../../../Helpers/TestdataHelper.js';

let pdpInputJson = open('../../../../data/pdpinput.json');

const appOwner = __ENV.org;
const appName = __ENV.app;
const environment = __ENV.env.toLowerCase();
const tokenGeneratorUserName = __ENV.tokengenuser;
const tokenGeneratorUserPwd = __ENV.tokengenuserpwd;
const user1Name = __ENV.user1name;
const user1Pwd = __ENV.user1pwd;
const user2Name = __ENV.user2name;
const user2Pwd = __ENV.user2pwd;
const user2OrgNo = __ENV.user2orgno;
const showResults = __ENV.showresults;

var altinnToken;
var altinnBuildVersion;
var org1_orgNo;
var org1_partyId;
var org2_orgNo;
var org2_partyId;
var user1_userId;
var user1_PartyId;
var user2_userId;
var user2_PartyId;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

export function setup() {
  var aspxauthCookie1 = setUpData.authenticateUser(user1Name, user1Pwd);
  var altinnStudioRuntimeCookie1 = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie1);
  var userData1 = setUpData.getUserData(altinnStudioRuntimeCookie1, appOwner, appName);

  var aspxauthCookie2 = setUpData.authenticateUser(user2Name, user2Pwd);
  var altinnStudioRuntimeCookie2 = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie2);
  var userData2 = setUpData.getUserData(altinnStudioRuntimeCookie2, appOwner, appName, user2OrgNo);

  var tokenGenParams = {
    env: environment,
    app: 'sbl.authorization',
  };

  var data = {
    altinnToken: generateToken('platform', tokenGeneratorUserName, tokenGeneratorUserPwd, tokenGenParams),
    user1Data: userData1,
    user2Data: userData2,
  };

  return data;
}

//Tests for platform Authorization:Delegations:Inheritance
export default function (data) {
  altinnToken = data.altinnToken;
  org1_orgNo = data.user1Data['orgNumber'];
  org1_partyId = data.user1Data['orgNumberPartyId'];
  org2_orgNo = data.user2Data['orgNumber'];
  org2_partyId = data.user2Data['orgNumberPartyId'];
  user1_userId = data.user1Data['userId'];
  user1_PartyId = data.user1Data['partyId'];
  user2_userId = data.user2Data['userId'];
  user2_PartyId = data.user2Data['partyId'];

  CleanupBeforeTests();

  //tests
  getPolicyOfAnApp();
  addReadAccessToUserThenDeleteIt();
  deletingNonExistingRuleFails();
  addingRuleWithInvalidValuesFails();
  addGetDeleteRuleAndCheckDecisions();
  delegateTwoRulesInOneRequest();
  delegateTwoRulesPartialSuccess();
  delegateRuleToAUserAndOrg();
}

export function CleanupBeforeTests() {
  helper.deleteAllRules(altinnToken, user1_userId, org1_partyId, user2_userId, 'userid', appOwner, appName);
  helper.deleteAllRules(altinnToken, user1_userId, org1_partyId, org2_partyId, 'partyid', appOwner, appName);
}

/** Retrieve policy of an app */
export function getPolicyOfAnApp() { 
    var resources = [{ appOwner: appOwner, appName: appName }];
    var res = delegation.getPolicies(resources);
    var success = check(res, {
      'GET app policy - status is 200': (r) => r.status === 200,
    });
    addErrorCount(success);
    if(showResults == 1) { console.log('getPolicyOfAnApp: ' + success); }
}

/** Add read access to a user for app in a particular task */
export function addReadAccessToUserThenDeleteIt() {
    // Arrange
    const performedByUserId = user1_userId;
    const offeredByPartyId = org1_partyId;
    const coveredByUserId = user2_userId;

    var policyMatchKeys = {
        coveredBy: 'urn:altinn:userid',
        resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:task'],
      };

    // Act
      var res = delegation.addRules(altinnToken, policyMatchKeys, performedByUserId, offeredByPartyId, coveredByUserId, appOwner, appName, 'Task_1', 'read');
      var success = check(res, {
        'Add delegation rule - status is 201': (r) => r.status === 201,
        'Add delegation rule - rule id is not empty': (r) => r.json('0.ruleId') != null,
        'Add delegation rule - createdSuccessfully is true': (r) => r.json('0.createdSuccessfully') === true,
        'Add delegation rule - offeredByPartyId matches': (r) => r.json('0.offeredByPartyId') === offeredByPartyId,
        'Add delegation rule - coveredBy matches': (r) => r.json('0.coveredBy.0.value') === coveredByUserId.toString(),
      });

    // Assert
      addErrorCount(success);
      stopIterationOnFail('Add delegation rule Failed', success, res);
      var ruleId = res.json('0.ruleId');
      sleep(3);

      // Act (deletion)
      res = delegation.deleteRules(altinnToken, policyMatchKeys, [ruleId], performedByUserId, offeredByPartyId, coveredByUserId, appOwner, appName, 'Task_1', 'read');
      
      // Assert (deletion)
      success = check(res, {
        'Delete delegated rule - status is 200': (r) => r.status === 200,
      });
      addErrorCount(success);
      if(showResults == 1) { console.log('addReadAccessToUserThenDeleteIt: ' + success); }
}

/** Deleting a non existing rules fails */
export function deletingNonExistingRuleFails() {
    var policyMatchKeys = {
        coveredBy: 'urn:altinn:userid',
        resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:task'],
    };

    var res = delegation.deleteRules(altinnToken, policyMatchKeys, ['12345678-a1b2-1234-1a23-1234a56b78c9'], user1_userId, org1_partyId, user2_userId, appOwner, appName, 'Task_1', 'read');
        var success = check(res, {
          'Delete a not existing rule - status is 400': (r) => r.status === 400,
        });
        addErrorCount(success);
        if(showResults == 1) { console.log('deletingNonExistingRuleFails: ' + success); }
}

/** Rules cannot be delegated with invalid app details */
export function addingRuleWithInvalidValuesFails() {
    var policyMatchKeys = {
        coveredBy: 'urn:altinn:userid',
        resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:task'],
    };
    var res = delegation.addRules(altinnToken, policyMatchKeys, user1_userId, org1_partyId, user2_userId, appOwner, appName, 'test', 'Task_1', 'read');
    var success = check(res, {
      'Add delegation rule for an invalid app - status is 400': (r) => r.status === 400,
      'Add delegation rule for an invalid app - failed': (r) => r.body == 'Delegation could not be completed',
    });
    addErrorCount(success);
    if(showResults == 1) { console.log('addRuleWithInvalidValuesFails: ' + success); }
}

export function addGetDeleteRuleAndCheckDecisions() {
  const performedByUserId = user1_userId;
  const offeredByPartyId = org1_partyId;
  const coveredByUserId = user2_userId;

  var resources = [{ appOwner: appOwner, appName: appName }];
  var policyMatchKeys = {
    coveredBy: 'urn:altinn:userid',
    resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:task'],
  };
    //add a rule to give write access
    var res = delegation.addRules(altinnToken, policyMatchKeys, performedByUserId, offeredByPartyId, coveredByUserId, appOwner, appName, 'Task_1', 'write');
    var ruleId = res.json('0.ruleId');
    sleep(3);
  
    //Retrieve all the rules that are delegated to an user from a party
    policyMatchKeys = {
      coveredBy: 'urn:altinn:userid',
      resource: ['urn:altinn:app', 'urn:altinn:org'],
    };
    var res = delegation.getRules(altinnToken, policyMatchKeys, offeredByPartyId, coveredByUserId, resources, null, null);
    var success = check(res, {
      'Get delegated rule - status is 200': (r) => r.status === 200,
      'Get delegated rule - rule id matches': (r) => r.json('0.ruleId') === ruleId,
      'Get delegated rule - createdSuccessfully is false': (r) => r.json('0.createdSuccessfully') === false,
      'Get delegated rule - offeredByPartyId matches': (r) => r.json('0.offeredByPartyId') === offeredByPartyId,
      'Get delegated rule - coveredBy matches': (r) => r.json('0.coveredBy.0.value') === coveredByUserId.toString(),
      'Get delegated rule - type is 1': (r) => r.json('0.type') === 1,
    });
    addErrorCount(success);
  
    //Decision to write is permit based on the delegated rule
    var jsonPermitData = {
      AccessSubject: ['urn:altinn:userid'],
      Action: ['write'],
      Resource: ['urn:altinn:app', 'urn:altinn:org', 'urn:altinn:partyid', 'urn:altinn:task'],
    };
    res = authorization.postGetDecision(pdpInputJson, jsonPermitData, appOwner, appName, coveredByUserId, offeredByPartyId, 'Task_1');
    success = check(res, {
      'Get PDP Decision for delegated rule Status is 200': (r) => r.status === 200,
      'Get PDP Decision for delegated rule - decision is permit': (r) => r.json('response.0.decision') === 'Permit',
    });
    addErrorCount(success);
  
    //Delete all the delegated rules from an user by a party
    res = delegation.deletePolicy(altinnToken, policyMatchKeys, performedByUserId, offeredByPartyId, coveredByUserId, appOwner, appName, null);
    success = check(res, {
      'Delete delegated policy with all rules - status is 200': (r) => r.status === 200,
    });
    addErrorCount(success);
    sleep(3);
  
    //Get rules that are deleted where response should be an empty array
    res = delegation.getRules(altinnToken, policyMatchKeys, offeredByPartyId, coveredByUserId, resources, null, null);
    success = check(res, {
      'Get deleted rules - status is 200': (r) => r.status === 200,
      'Get deleted rules - response is empty': (r) => r.json().length === 0,
    });
    addErrorCount(success);
  
    //User can no longer write to app instance after delegate policy is deleted
    res = authorization.postGetDecision(pdpInputJson, jsonPermitData, appOwner, appName, coveredByUserId, offeredByPartyId, 'Task_1');
    success = check(res, {
      'Get PDP Decision for deleted rule - Status is 200': (r) => r.status === 200,
      'Get PDP Decision for deleted rule - decision is notapplicable': (r) => r.json('response.0.decision') === 'NotApplicable',
    });
    addErrorCount(success);
    if(showResults == 1) { console.log('addGetDeleteRuleAndCheckDecisions: ' + success); }
}

export function delegateTwoRulesInOneRequest() {
  // Arrange
  const performedByUserId = user1_userId;
  const offeredByPartyId = org1_partyId;
  const coveredByUserId = user2_userId;
  var rulesList = [];
  rulesList.push(helper.generateDataForAddMultipleRules(performedByUserId, offeredByPartyId, coveredByUserId, 'userid', 'Task_1', 'read'));
  rulesList.push(helper.generateDataForAddMultipleRules(performedByUserId, offeredByPartyId, coveredByUserId, 'userid', 'Task_1', 'write'));
  
  // Act
  var res = delegation.addMultipleRules(altinnToken, rulesList);
  
  // Assert
  var success = check(res, {
    'Add multiple rules - status is 201': (r) => r.status === 201,
    'Add multiple rules - rule 1 created successfully is true': (r) => r.json('0.createdSuccessfully') === true,
    'Add multiple rules - rule 2 created successfully is true': (r) => r.json('1.createdSuccessfully') === true
  });
  addErrorCount(success);
  helper.checkPDPDecision(offeredByPartyId, coveredByUserId, 'Task_1', 'read', 'Permit', showResults);
  helper.checkPDPDecision(offeredByPartyId, coveredByUserId, 'Task_1', 'write', 'Permit', showResults);

  // Cleanup
  helper.deleteAllRules(altinnToken, performedByUserId, offeredByPartyId, coveredByUserId, 'userid', appOwner, appName);
  helper.checkPDPDecision(offeredByPartyId, coveredByUserId, 'Task_1', 'read', 'NotApplicable', showResults);
  helper.checkPDPDecision(offeredByPartyId, coveredByUserId, 'Task_1', 'write', 'NotApplicable', showResults);
  if(showResults == 1) {console.log('delegateTwoRulesInOneRequest:' + success);}
  sleep(3);

}

export function delegateTwoRulesPartialSuccess() {

  // Arrange
  const performedByUserId = user1_userId;
  const offeredByPartyId = org1_partyId;
  const coveredByUserId = user2_userId;
  var rulesList = [];
  rulesList.push(helper.generateDataForAddMultipleRules(performedByUserId, offeredByPartyId, coveredByUserId, 'userid', 'Task_1', 'read','ttd','nonExistentApp'));
  rulesList.push(helper.generateDataForAddMultipleRules(performedByUserId, offeredByPartyId, coveredByUserId, 'userid', 'Task_1', 'write'));
  
  // Act
  var res = delegation.addMultipleRules(altinnToken, rulesList);
  
  // Assert
  var success = check(res, {
    'Add multiple rules - status is 206': (r) => r.status === 206,
    'Add multiple rules - rule 1 created successfully is false': (r) => r.json('0.createdSuccessfully') === false,
    'Add multiple rules - rule 2 created successfully is true': (r) => r.json('1.createdSuccessfully') === true
  });
  
  addErrorCount(success);
  helper.checkPDPDecision(offeredByPartyId, coveredByUserId, 'Task_1', 'read', 'NotApplicable', showResults);
  helper.checkPDPDecision(offeredByPartyId, coveredByUserId, 'Task_1', 'write', 'Permit', showResults);

  // Cleanup
  helper.deleteAllRules(altinnToken, performedByUserId, offeredByPartyId, coveredByUserId, 'userid', appOwner, appName);
  helper.checkPDPDecision(offeredByPartyId, coveredByUserId, 'Task_1', 'read', 'NotApplicable', showResults);
  helper.checkPDPDecision(offeredByPartyId, coveredByUserId, 'Task_1', 'write', 'NotApplicable', showResults);
  if(showResults == 1) {console.log('delegateTwoRulesPartialSuccess:' + success);}
  sleep(3);

}
  
export function delegateRuleToAUserAndOrg() {

  // Arrange
  const performedByUserId = user1_userId;
  const offeredByPartyId = org1_partyId;
  const coveredByUserId = user2_userId;
  const coveredByPartyId =org2_partyId;
  var rulesList = [];
  rulesList.push(helper.generateDataForAddMultipleRules(performedByUserId, offeredByPartyId, coveredByUserId, 'userid', 'Task_1', 'read'));
  rulesList.push(helper.generateDataForAddMultipleRules(performedByUserId, offeredByPartyId, coveredByPartyId, 'partyid', 'Task_1', 'read'));
  
  // Act
  var res = delegation.addMultipleRules(altinnToken, rulesList);
  
  // Assert
  var success = check(res, {
    'Add multiple rules - status is 201': (r) => r.status === 201,
    'Add multiple rules - rule 1 created successfully is true': (r) => r.json('0.createdSuccessfully') === true,
    'Add multiple rules - rule 2 created successfully is true': (r) => r.json('1.createdSuccessfully') === true
  });
  
  addErrorCount(success);
  helper.checkPDPDecision(offeredByPartyId, coveredByUserId, 'Task_1', 'read', 'Permit', showResults);

  // Cleanup
  helper.deleteAllRules(altinnToken, performedByUserId, offeredByPartyId, coveredByUserId, 'userid', appOwner, appName);
  helper.checkPDPDecision(offeredByPartyId, coveredByUserId, 'Task_1', 'read', 'Permit', showResults);
  helper.deleteAllRules(altinnToken, performedByUserId, offeredByPartyId, coveredByPartyId, 'partyid', appOwner, appName);
  helper.checkPDPDecision(offeredByPartyId, coveredByUserId, 'Task_1', 'read', 'NotApplicable', showResults);
  if(showResults == 1) {console.log('delegateRuleToAUserAndOrg:' + success);}
  sleep(3);

}


export function handleSummary(data) {
  let result = {};
  result[reportPath('authzDelegationsv2.xml')] = generateJUnitXML(data, 'platform-authorization-delegation-delegations-v2');
  return result;
}

export function showTestData() {
  console.log('environment: ' + environment);
  console.log('altinnBuildVersion: ' + altinnBuildVersion);
  console.log('org1_orgNo ' + org1_orgNo);
  console.log('org1_partyId ' + org1_partyId);
  console.log('org2_orgNo ' + org2_orgNo);
  console.log('org2_partyId ' + org2_partyId);
  console.log('org3_orgNo ' + org3_orgNo);
  console.log('org3_partyId ' + org3_partyId);
  console.log('org4_orgNo ' + org4_orgNo);
  console.log('org4_partyId ' + org4_partyId);
  console.log('user1_userId ' + user1_userId);
  console.log('user1_PartyId ' + user1_PartyId);
  console.log('user2_userId ' + user2_userId);
  console.log('user2_PartyId ' + user2_PartyId);
  console.log('user3_userId ' + user3_userId);
  console.log('user3_PartyId ' + user3_PartyId);
  console.log('ecUser_userId ' + ecUser_userId);
  console.log('ecUser_partyId ' + ecUser_partyId);
}