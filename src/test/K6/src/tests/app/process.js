/* 
  Test data required: username, password, app requiring level 2 login (reference app: ttd/apps-test)
  command to run the test: docker-compose run k6 run src/tests/app/process.js -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=***
*/

import { check } from "k6";
import { addErrorCount } from "../../errorcounter.js";
import * as appInstances from "../../api/app/instances.js"
import * as appProcess from "../../api/app/process.js"
import * as platformInstances from "../../api/storage/instances.js"
import { deleteSblInstance } from "../../api/storage/messageboxinstances.js"
import * as setUpData from "../../setup.js";

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;

export const options = {
    thresholds: {
        "errors": ["count<1"]
    },
    setupTimeout: '1m'
};

//Function to setup data and return AltinnstudioRuntime Token
export function setup() {
    var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
    var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
    data.RuntimeToken = altinnStudioRuntimeCookie;
    setUpData.clearCookies();
    var instanceId = appInstances.postInstance(altinnStudioRuntimeCookie, data["partyId"], appOwner, level2App);
    instanceId = platformInstances.findInstanceId(instanceId.body);
    data.instanceId = instanceId;
    return data;
};


//Tests for App API: Process
export default function (data) {
    const runtimeToken = data["RuntimeToken"];
    const partyId = data["partyId"];
    var instanceId = data["instanceId"];

    //Test to start process of an app instance again and verify response code to be 409
    var res = appProcess.postStartProcess(runtimeToken, partyId, instanceId, appOwner, level2App);
    var success = check(res, {
        "App POST Start process again Not Possible status is 409:": (r) => r.status === 409
    });
    addErrorCount(success);

    //Test to get current process of an app instance and verify response code to be 200
    res = appProcess.getCurrentProcess(runtimeToken, partyId, instanceId, appOwner, level2App);
    success = check(res, {
        "App GET current process status is 200:": (r) => r.status === 200
    });
    addErrorCount(success);

    var currentProcessElement = (JSON.parse(res.body)).currentTask.elementId;

    //Test to move the process of an app instance to the current process element and verify response code to be 409
    res = appProcess.putNextProcess(runtimeToken, partyId, instanceId, currentProcessElement, appOwner, level2App);
    success = check(res, {
        "App PUT Move process to current process element Not Possible status is 409:": (r) => r.status === 409
    });
    addErrorCount(success);

    //Test to get next process of an app instance again and verify response code  to be 200
    res = appProcess.getNextProcess(runtimeToken, partyId, instanceId, appOwner, level2App);
    success = check(res, {
        "App GET Next process status is 200:": (r) => r.status === 200
    });
    addErrorCount(success);

    //Test to get the process history of an app instance and verify the response code to be 200
    res = appProcess.getProcessHistory(runtimeToken, partyId, instanceId, appOwner, level2App);
    success = check(res, {
        "App GET Process history:": (r) => r.status === 200
    });
};

//Delete the instance created
export function teardown(data) {
    const runtimeToken = data["RuntimeToken"];
    const partyId = data["partyId"];
    const instanceId = data["instanceId"];

    deleteSblInstance(runtimeToken, partyId, instanceId, "true");
};