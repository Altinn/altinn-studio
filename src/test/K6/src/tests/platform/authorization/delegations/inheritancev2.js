/*
  Test data required: deployed app (reference app: ttd/apps-test)
  Username and password for a user with the DAGL role for an organization (user1 and user2)
  Username and password for a user with the DAGL role for an organization with subunits (user3)
  Username, password, and org number for an enterprise user (ecusername, ecuserpwd, ecuserorgno)
  Org number for user2's org (same as org number for the enterprise user)
  Command: docker-compose run k6 run /src/tests/platform/authorization/delegations/inheritancev2.js 
  -e env=*** -e org=*** -e app=*** -e tokengenuser=*** -e tokengenuserpwd=*** -e appsaccesskey=*** 
  -e user1name=*** -e user1pwd=*** -e subunitorgno=***  -e user2name=*** -e user2pwd=*** -e user2orgno=*** 
  -e user3name=*** -e user3pwd=*** -e ecusername=*** -e ecuserpwd=*** -e ecuserorgno=*** -e ecuseruserid=***
  -e ecuserpartyid=*** -e showresults=***
*/
import { check, sleep, fail } from 'k6';
import { addErrorCount, stopIterationOnFail } from '../../../../errorcounter.js';
import * as delegation from '../../../../api/platform/authorization/delegations.js';
import * as authorization from '../../../../api/platform/authorization/authorization.js';
import { generateToken } from '../../../../api/altinn-testtools/token-generator.js';
import { generateJUnitXML, reportPath } from '../../../../report.js';
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
const subunitOrgNo = __ENV.subunitorgno;
const user2Name = __ENV.user2name;
const user2Pwd = __ENV.user2pwd;
const user2OrgNo = __ENV.user2orgno;
const user3Name = __ENV.user3name;
const user3Pwd = __ENV.user3pwd;
const user3OrgNo = __ENV.user3orgno;
const ecUserName = __ENV.ecusername;
const ecUserPwd = __ENV.ecuserpwd;
const ecUserOrgNo = __ENV.ecuserorgno;
const ecUserUserId = __ENV.ecuseruserid;
const ecUserPartyId = __ENV.ecuserpartyid;
const showResults = __ENV.showresults;

var altinnToken;
var altinnBuildVersion;
var org1_orgNo;
var org1_partyId;
var org2_orgNo;
var org2_partyId;
var org3_orgNo;
var org3_partyId;
var org4_orgNo;
var org4_partyId;
var user1_userId;
var user1_PartyId;
var user2_userId;
var user2_PartyId;
var user3_userId;
var user3_PartyId;
var ecUser_userId;
var ecUser_partyId;

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

  var aspxauthCookie3 = setUpData.authenticateUser(user3Name, user3Pwd);
  var altinnStudioRuntimeCookie3 = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie3);
  var userData3 = setUpData.getUserData(altinnStudioRuntimeCookie3, appOwner, appName, user3OrgNo);

  var ecUserData;
  if(helper.minimumSBLVersion(22, 5) && environment != 'tt02') {
    ecUserData = setUpData.authenticateECUser(ecUserName, ecUserPwd, ecUserOrgNo);
  }
  else if (environment == 'tt02') {
    ecUserData = {
      userName: ecUserName,
      userId: ecUserUserId,
      partyId: ecUserPartyId
    }
  }

  var tokenGenParams = {
    env: environment,
    app: 'sbl.authorization',
  };

  var res = authorization.getParties(altinnStudioRuntimeCookie3, userData3['userId']);
  res = JSON.parse(res.body);
  for (var i = 0; i < res.length; i++) {
    if (res[i].orgNumber != null && res[i].childParties != null) {
      for (var j = 0; j < res[i].childParties.length; j++) {
        if (res[i].childParties[j].orgNumber == subunitOrgNo) {
          userData3.childOrgNumber = res[i].childParties[j].orgNumber;
          userData3.childOrgNumberPartyId = res[i].childParties[j].partyId;
          break;
        }
      }
    }
  }

  var data = {
    altinnToken: generateToken('platform', tokenGeneratorUserName, tokenGeneratorUserPwd, tokenGenParams),
    user1Data: userData1,
    user2Data: userData2,
    user3Data: userData3,
    ecUserData: ecUserData
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
  org3_orgNo = data.user3Data['orgNumber'];
  org3_partyId = data.user3Data['orgNumberPartyId'];
  org4_orgNo = data.user3Data['childOrgNumber'];
  org4_partyId = data.user3Data['childOrgNumberPartyId'];
  user1_userId = data.user1Data['userId'];
  user1_PartyId = data.user1Data['partyId'];
  user2_userId = data.user2Data['userId'];
  user2_PartyId = data.user2Data['partyId'];
  user3_userId = data.user3Data['userId'];
  user3_PartyId = data.user3Data['partyId'];
  if(helper.minimumSBLVersion(22, 5)) {
    ecUser_userId = data.ecUserData['userId'];
    ecUser_partyId = data.ecUserData['partyId'];
  }

  CleanupBeforeTests();

  //tests
  directDelegationFromOrgToUser();
  directDelegationFromOrgToOrg();
  directDelegationFromMainUnitToUser();
  directDelegationFromMainUnitToOrg();
  directDelegationFromMainUnitToOrgInheritedByDAGLViaKeyRole();
  delegationToOrgIsInheritedByECUserViaKeyrole();
}

export function CleanupBeforeTests() {
  helper.deleteAllRules(altinnToken, user1_userId, org1_partyId, user2_userId, 'userid', appOwner, appName);
  helper.deleteAllRules(altinnToken, user1_userId, org1_partyId, org2_partyId, 'partyid', appOwner, appName);
  helper.deleteAllRules(altinnToken, user3_userId, org3_partyId, user2_userId, 'userid', appOwner, appName);
  helper.deleteAllRules(altinnToken, user3_userId, org3_partyId, org2_partyId, 'partyid', appOwner, appName);
}

/**
 * Tests that an organization (org1) can successfully delegate directly to a user (user2)
 */
export function directDelegationFromOrgToUser() {
  // Arrange
  const performedByUserId = user1_userId;
  const offeredByPartyId = org1_partyId;
  const coveredByUserId = user2_userId;
  var resources = [{ appOwner: appOwner, appName: appName }];
  var ruleId = helper.addRulesForTest(performedByUserId, offeredByPartyId, coveredByUserId, 'userid', 'Task_1', 'read');
  
  // Act
  var policyMatchKeys = {
    coveredBy: 'urn:altinn:userid',
    resource: ['urn:altinn:app', 'urn:altinn:org'],
  };
  var res = delegation.getRules(altinnToken, policyMatchKeys, offeredByPartyId, coveredByUserId, resources, null, null);

  // Assert
  var success = check(res, {
    'Direct delegation from org to user - status is 200': (r) => r.status === 200,
    'Direct delegation from org to user - rule id matches': (r) => r.json('0.ruleId') === ruleId,
    'Direct delegation from org to user - createdSuccessfully is false': (r) => r.json('0.createdSuccessfully') === false,
    'Direct delegation from org to user - offeredByPartyId matches': (r) => r.json('0.offeredByPartyId') === offeredByPartyId,
    'Direct delegation from org to user - coveredBy is userid': (r) => r.json('0.coveredBy.0.id') === 'urn:altinn:userid',
    'Direct delegation from org to user - coveredBy matches': (r) => r.json('0.coveredBy.0.value') === coveredByUserId.toString(),
    'Direct delegation from org to user - type is 1': (r) => r.json('0.type') === 1,
  });
  addErrorCount(success);
  helper.checkPDPDecision(offeredByPartyId, coveredByUserId, 'Task_1', 'read', 'Permit', 1);
    
  // Cleanup
  helper.deleteAllRules(altinnToken, performedByUserId, offeredByPartyId, coveredByUserId, 'userid', appOwner, appName);
  helper.checkPDPDecision(offeredByPartyId, coveredByUserId, 'Task_1', 'read', 'NotApplicable', 1);
  if(showResults == 1) {console.log('directDelegationFromOrgToUser:' + success);}
  
  sleep(3);
}

/**
 * Tests that an organization (org1) can successfully delegate directly to another organization (org2)
 */
export function directDelegationFromOrgToOrg() {
  // Arrange
  const performedByUserId = user1_userId;
  const offeredByPartyId = org1_partyId;
  const coveredByPartyId = org2_partyId;
  const DAGLUserIdForCoveredBy= user2_userId;
  var resources = [{ appOwner: appOwner, appName: appName }];
  var ruleId = helper.addRulesForTest(performedByUserId, offeredByPartyId, coveredByPartyId, 'partyid', 'Task_1', 'read');

  // Act
  var policyMatchKeys = {
    coveredBy: 'urn:altinn:partyid',
    resource: ['urn:altinn:app', 'urn:altinn:org'],
  };
  var res = delegation.getRules(altinnToken, policyMatchKeys, offeredByPartyId, coveredByPartyId, resources, null, null);


  // Assert
  var success = check(res, {
    'Direct delegation from org to org - status is 200': (r) => r.status === 200,
    'Direct delegation from org to org - rule id matches': (r) => r.json('0.ruleId') === ruleId,
    'Direct delegation from org to org - createdSuccessfully is false': (r) => r.json('0.createdSuccessfully') === false,
    'Direct delegation from org to org - offeredByPartyId matches': (r) => r.json('0.offeredByPartyId') === offeredByPartyId,
    'Direct delegation from org to org - coveredBy is userid': (r) => r.json('0.coveredBy.0.id') === 'urn:altinn:partyid',
    'Direct delegation from org to org - coveredBy matches': (r) => r.json('0.coveredBy.0.value') === coveredByPartyId.toString(),
    'Direct delegation from org to org - type is 1': (r) => r.json('0.type') === 1,
  });
  addErrorCount(success)
  helper.checkPDPDecision(offeredByPartyId, DAGLUserIdForCoveredBy, 'Task_1', 'read', 'Permit', 1);

  // Cleanup
  helper.deleteAllRules(altinnToken, performedByUserId, offeredByPartyId, coveredByPartyId, 'partyid', appOwner, appName);
  helper.checkPDPDecision(offeredByPartyId, DAGLUserIdForCoveredBy, 'Task_1', 'read', 'NotApplicable', 1);
  if(showResults == 1) {console.log('directDelegationFromOrgToOrg:' + success);}
  sleep(3);
}

/**
 * Tests that when an organization (org3) delegates to a user (user2), that user also has access to the organization's subunit (org4)
 */
export function directDelegationFromMainUnitToUser() {
  // Arrange
  const performedByUserId = user3_userId;
  const offeredByParentPartyId = org3_partyId;
  const subUnitPartyId = org4_partyId;
  const coveredByUserId = user2_userId;
  var resources = [{ appOwner: appOwner, appName: appName }];
  var ruleId = helper.addRulesForTest(performedByUserId, offeredByParentPartyId, coveredByUserId, 'userid', 'Task_1', 'read');

  // Act
  var policyMatchKeys = {
    coveredBy: 'urn:altinn:userid',
    resource: ['urn:altinn:app', 'urn:altinn:org'],
  };
  var res = delegation.getRules(altinnToken, policyMatchKeys, subUnitPartyId, coveredByUserId, resources, offeredByParentPartyId, null);

  // Assert
  var success = check(res, {
    'Direct delegation from mainunit to user - status is 200': (r) => r.status === 200,
    'Direct delegation from mainunit to user - rule id matches': (r) => r.json('0.ruleId') === ruleId,
    'Direct delegation from mainunit to user - createdSuccessfully is false': (r) => r.json('0.createdSuccessfully') === false,
    'Direct delegation from mainunit to user - offeredByPartyId matches': (r) => r.json('0.offeredByPartyId') === offeredByParentPartyId,
    'Direct delegation from mainunit to user - coveredBy is userid': (r) => r.json('0.coveredBy.0.id') === 'urn:altinn:userid',
    'Direct delegation from mainunit to user - coveredBy matches': (r) => r.json('0.coveredBy.0.value') === coveredByUserId.toString(),
    'Direct delegation from mainunit to user - type is 3': (r) => r.json('0.type') === 3,
  });
  addErrorCount(success);
  helper.checkPDPDecision(subUnitPartyId, coveredByUserId, 'Task_1', 'read', 'Permit', 1);
    
  // Cleanup
  helper.deleteAllRules(altinnToken, performedByUserId, offeredByParentPartyId, coveredByUserId, 'userid', appOwner, appName);
  helper.checkPDPDecision(subUnitPartyId, coveredByUserId, 'Task_1', 'read', 'NotApplicable', 1);
  if(showResults == 1) {console.log('directDelegationFromMainUnitToUser:' + success);}
  sleep(3);
}

/**
 * Tests that when an organization (org3) delegates to another org (org2), that the DAGL of that org also has access to the subunit (org4)
 */
export function directDelegationFromMainUnitToOrg() {
  // Arrange
  const performedByUserId = user3_userId;
  const offeredByParentPartyId = org3_partyId;
  const subUnitPartyId = org4_partyId;
  const coveredByPartyId = org2_partyId;
  const DAGLUserIdForCoveredBy= user2_userId;
  var resources = [{ appOwner: appOwner, appName: appName }];
  var ruleId = helper.addRulesForTest(performedByUserId, offeredByParentPartyId, coveredByPartyId, 'partyid', 'Task_1', 'read');

  // Act
  var policyMatchKeys = {
    coveredBy: 'urn:altinn:partyid',
    resource: ['urn:altinn:app', 'urn:altinn:org'],
  };
  var res = delegation.getRules(altinnToken, policyMatchKeys, subUnitPartyId, coveredByPartyId, resources, offeredByParentPartyId, null);

  // Assert
  var success = check(res, {
    'Direct delegation from mainunit to org - status is 200': (r) => r.status === 200,
    'Direct delegation from mainunit to org - rule id matches': (r) => r.json('0.ruleId') === ruleId,
    'Direct delegation from mainunit to org - createdSuccessfully is false': (r) => r.json('0.createdSuccessfully') === false,
    'Direct delegation from mainunit to org - offeredByPartyId matches': (r) => r.json('0.offeredByPartyId') === offeredByParentPartyId,
    'Direct delegation from mainunit to org - coveredBy is userid': (r) => r.json('0.coveredBy.0.id') === 'urn:altinn:partyid',
    'Direct delegation from mainunit to org - coveredBy matches': (r) => r.json('0.coveredBy.0.value') === coveredByPartyId.toString(),
    'Direct delegation from mainunit to org - type is 3': (r) => r.json('0.type') === 3,
  });
  addErrorCount(success);

  helper.checkPDPDecision(subUnitPartyId, DAGLUserIdForCoveredBy, 'Task_1', 'read', 'Permit', 1);
    
  // Cleanup
  helper.deleteAllRules(altinnToken, performedByUserId, offeredByParentPartyId, coveredByPartyId, 'partyid', appOwner, appName);
  helper.checkPDPDecision(subUnitPartyId, DAGLUserIdForCoveredBy, 'Task_1', 'read', 'NotApplicable', 1);
  if(showResults == 1) {console.log('directDelegationFromMainUnitToOrg:' + success);}
  sleep(3);
}

/**
 * Tests that when an organization (org3) delegates to another org (org2), that the DAGL of that org also has access to the subunit (org4)
 */
 export function directDelegationFromMainUnitToOrgInheritedByDAGLViaKeyRole() {
  // Arrange
  const performedByUserId = user3_userId;
  const offeredByParentPartyId = org3_partyId;
  const subUnitPartyId = org4_partyId;
  const coveredByPartyId = org2_partyId;
  const DAGLUserIdForCoveredBy= user2_userId;
  var resources = [{ appOwner: appOwner, appName: appName }];
  var ruleId = helper.addRulesForTest(performedByUserId, offeredByParentPartyId, coveredByPartyId, 'partyid', 'Task_1', 'read');

  // Act
  var policyMatchKeys = {
    coveredBy: 'urn:altinn:userid',
    resource: ['urn:altinn:app', 'urn:altinn:org'],
  };
  var res = delegation.getRules(altinnToken, policyMatchKeys, subUnitPartyId, DAGLUserIdForCoveredBy, resources, offeredByParentPartyId, [coveredByPartyId]);
  // Assert
  var success = check(res, {
    'mainunit to org inherited by DAGL via keyrole - status is 200': (r) => r.status === 200,
    'mainunit to org inherited by DAGL via keyrole - rule id matches': (r) => r.json('0.ruleId') === ruleId,
    'mainunit to org inherited by DAGL via keyrole - createdSuccessfully is false': (r) => r.json('0.createdSuccessfully') === false,
    'mainunit to org inherited by DAGL via keyrole - offeredByPartyId matches': (r) => r.json('0.offeredByPartyId') === offeredByParentPartyId,
    'mainunit to org inherited by DAGL via keyrole - coveredBy is userid': (r) => r.json('0.coveredBy.0.id') === 'urn:altinn:partyid',
    'mainunit to org inherited by DAGL via keyrole - coveredBy matches': (r) => r.json('0.coveredBy.0.value') === coveredByPartyId.toString(),
    'mainunit to org inherited by DAGL via keyrole - type is 4': (r) => r.json('0.type') === 4,
  });
  addErrorCount(success);

  helper.checkPDPDecision(subUnitPartyId, DAGLUserIdForCoveredBy, 'Task_1', 'read', 'Permit', 1);
    
  // Cleanup
  helper.deleteAllRules(altinnToken, performedByUserId, offeredByParentPartyId, coveredByPartyId, 'partyid', appOwner, appName);
  helper.checkPDPDecision(subUnitPartyId, DAGLUserIdForCoveredBy, 'Task_1', 'read', 'NotApplicable', 1);
  if(showResults == 1) {console.log('directDelegationFromMainUnitToOrgInheritedByDAGLViaKeyRole:' + success);}
  sleep(3);
}

/**
 * Verifies that when a delegation is made from one org (org1) to another (org2), the Enterprise Certificate user (ECUser) for that organization is also given access
 */
export function delegationToOrgIsInheritedByECUserViaKeyrole() {

    if(!helper.minimumSBLVersion(22, 5)) {
      console.log('delegationToOrgIsInheritedByECUserViaKeyrole: skipped');
      return;
    }
    // Arrange
    const performedByUserId = user1_userId;
    const offeredByPartyId = org1_partyId;
    const coveredByPartyId = org2_partyId;
    const ecUserIdForCoveredBy= ecUser_userId;
    var resources = [{ appOwner: appOwner, appName: appName }];
    var ruleId = helper.addRulesForTest(performedByUserId, offeredByPartyId, coveredByPartyId, 'partyid', 'Task_1', 'read');
  
    // Act
    var policyMatchKeys = {
      coveredBy: 'urn:altinn:userid',
      resource: ['urn:altinn:app', 'urn:altinn:org'],
    };
    var res = delegation.getRules(altinnToken, policyMatchKeys, offeredByPartyId, ecUserIdForCoveredBy, resources, null, [coveredByPartyId]);
  
    // Assert
    var success = check(res, {
      'Delegation to Org is inherited by ECUser via keyrole - status is 200': (r) => r.status === 200,
      'Delegation to Org is inherited by ECUser via keyrole - rule id matches': (r) => r.json('0.ruleId') === ruleId,
      'Delegation to Org is inherited by ECUser via keyrole - createdSuccessfully is false': (r) => r.json('0.createdSuccessfully') === false,
      'Delegation to Org is inherited by ECUser via keyrole - offeredByPartyId matches': (r) => r.json('0.offeredByPartyId') === offeredByPartyId,
      'Delegation to Org is inherited by ECUser via keyrole - coveredBy is userid': (r) => r.json('0.coveredBy.0.id') === 'urn:altinn:partyid',
      'Delegation to Org is inherited by ECUser via keyrole - coveredBy matches': (r) => r.json('0.coveredBy.0.value') === coveredByPartyId.toString(),
      'Delegation to Org is inherited by ECUser via keyrole - type is 2': (r) => r.json('0.type') === 2,
    });
    addErrorCount(success);
  
    // Cleanup
    helper.checkPDPDecision(offeredByPartyId, ecUserIdForCoveredBy, 'Task_1', 'read', 'Permit', 1);
      
    // Cleanup
    helper.deleteAllRules(altinnToken, performedByUserId, offeredByPartyId, coveredByPartyId, 'partyid', appOwner, appName);
    helper.checkPDPDecision(offeredByPartyId, ecUserIdForCoveredBy, 'Task_1', 'read', 'NotApplicable', 1);
    if(showResults == 1) {console.log('delegationToOrgIsInheritedByECUserViaKeyrole:' + success);}
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('authzDelegationInheritancev2.xml')] = generateJUnitXML(data, 'platform-authorization-delegation-inheritance-v2');
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