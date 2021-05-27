/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run /src/tests/platform/storage/deleteinstances.js 
    -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appnames=app1;app2 -e appsaccesskey=*** -e sblaccesskey=***
*/

import { check } from 'k6';
import * as sbl from '../../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../../setup.js';
import { addErrorCount } from '../../../errorcounter.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;
let appNames = __ENV.appnames;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
};

//Function to setup data and return AltinnstudioRuntime Token and user details
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  setUpData.clearCookies();
  return data;
}

//Hard delete instances under a party id based on supplied app names
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  var res, success, instances;
  var instancesCount = 0;

  try {
    appNames = appNames.split(';');
    appNames.push(level2App);
  } catch (error) {
    appNames = [];
    appNames.push(level2App);
  }

  do {
    //Find active instances under the party id to be deleted.
    var filters = {
      'instanceOwner.partyId': partyId,
    };
    res = sbl.searchSblInstances(runtimeToken, filters);

    //Filter instances based on appName
    instances = sbl.filterInstancesByAppName(appNames, res.body);
    instancesCount = instances.length;

    //hard delete all the instances fetched
    if (instancesCount > 0) {
      sbl.hardDeleteManyInstances(runtimeToken, instances);

      //Find more instances to loop through
      res = sbl.searchSblInstances(runtimeToken, filters);
      success = check(res, {
        'GET SBL Instance by Party status is 200': (r) => r.status === 200,
      });
      addErrorCount(success);

      instances = sbl.filterInstancesByAppName(appNames, res.body);
      instancesCount = instances.length;
    }
  } while (instancesCount > 0);
}
