/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run src/tests/platform/storage/messageboxinstances.js -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=***
*/

import { check } from "k6";
import * as instances from "../../../api/storage/instances.js"
import * as sbl from "../../../api/storage/messageboxinstances.js"
import * as setUpData from "../../../setup.js";
import { addErrorCount } from "../../../errorcounter.js";

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;
let instanceJson = open("../../../data/instance.json");


export const options = {
  thresholds: {
    "errors": ["count<1"]
  },
  setupTimeout: '1m'
};

//Function to setup data and return AltinnstudioRuntime Token, instance and user details
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  setUpData.clearCookies();
  var instanceId = instances.postInstance(altinnStudioRuntimeCookie, data["partyId"], appOwner, level2App, instanceJson);
  instanceId = instances.findInstanceId(instanceId.body);
  data.instanceId = instanceId;
  return data;
};

//Tests for platform Storage: MessageBoxInstances
export default function (data) {
  const runtimeToken = data["RuntimeToken"];
  const partyId = data["partyId"];
  const instanceId = data["instanceId"];
  var res, success;

  //Test to get an instance by id from storage: SBL and validate the response
  res = sbl.getSblInstanceById(runtimeToken, partyId, instanceId);
  success = check(res, {
    "GET SBL Instance by Id status is 200:": (r) => r.status === 200,
    "GET SBL Instance by Id Instance Id matches:": (r) => (JSON.parse(r.body)).id === instanceId
  });
  addErrorCount(success);

  //Test to get an instance for a party from storage: SBL and validate the response
  res = sbl.getSblInstanceByParty(runtimeToken, partyId);
  success = check(res, {
    "GET SBL Instance by Party status is 200:": (r) => r.status === 200
  });
  addErrorCount(success);

  //Test to soft delete an instance from storage: SBL and validate the response
  res = sbl.deleteSblInstance(runtimeToken, partyId, instanceId, "false");
  success = check(res, {
    "Soft DELETE instance status is 200:": (r) => r.status === 200,
    "Soft DELETE instance Response is true:": (r) => r.body === "true"
  });
  addErrorCount(success);

  //Test to restore a soft deleted instance from storage: SBL and validate the response
  res = sbl.restoreSblInstance(runtimeToken, partyId, instanceId);
  success = check(res, {
    "Restore Soft deleted instance Status is 200:": (r) => r.status === 200,
    "Restore Soft deleted instance Response is true:": (r) => r.body === "true"
  });
  addErrorCount(success);

  //Test to get an instance events from storage: SBL and validate the response
  res = sbl.getSblInstanceEvents(runtimeToken, partyId, instanceId);
  success = check(res, {
    "GET SBL Instance Events status is 200:": (r) => r.status === 200,
    "GET SBL Instance Events Events Counts matches:": (r) => (JSON.parse(r.body)).length === 3
  });
  addErrorCount(success);

  //Test to hard delete an instance from storage: SBL and validate the response
  res = sbl.deleteSblInstance(runtimeToken, partyId, instanceId, "true");
  success = check(res, {
    "Hard DELETE instance status is 200:": (r) => r.status === 200,
    "Hard DELETE instance Response is true:": (r) => r.body === "true"
  });
  addErrorCount(success);

  //Test to restore a hard deleted instance from storage: SBL and validate the response to have 400
  res = sbl.restoreSblInstance(runtimeToken, partyId, instanceId);
  success = check(res, {
    "Restore Hard Deleted instance status is 400:": (r) => r.status === 400
  });
  addErrorCount(success);
};