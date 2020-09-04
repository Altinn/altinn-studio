/* 
    Pre-reqisite for test: 
    1. MaskinPorteTokenGenerator https://github.com/Altinn/MaskinportenTokenGenerator built
    2. Installed appOwner certificate
    3. Send maskinporten token as environment variable after generating the token

    This test script is to create instance of an app as an appowner for a party id
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test) to find the party id of the user to create an instance
    and maskinporten token
    Command: docker-compose run k6 run src/tests/platform/storage/appowner/createinstance.js 
    -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e subskey=*** -e maskinporten=token
*/

import { check } from "k6";
import { addErrorCount } from "../../../../errorcounter.js";
import { convertMaskinPortenToken } from "../../../../api/platform/authentication.js"
import * as instances from "../../../../api/storage/instances.js"
import * as setUpData from "../../../../setup.js";

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;
const maskinPortenToken = __ENV.maskinporten;
let instanceJson = open("../../../../data/instance.json");

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
    setUpData.clearCookies();
    var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
    altinnStudioRuntimeCookie = convertMaskinPortenToken(maskinPortenToken, "true");
    data.RuntimeToken = altinnStudioRuntimeCookie;
    return data;
};


//Tests for platform Storage: Instances for an appowner
export default function (data) {
    const runtimeToken = data["RuntimeToken"];
    const partyId = data["partyId"];
    var instanceId = "";
    var res, success;

    //Test to create an instance with storage api and validate the response that created by is an app owner
    res = instances.postInstance(runtimeToken, partyId, appOwner, level2App, instanceJson);
    success = check(res, {
        "POST Create Instance status is 201:": (r) => r.status === 201,
        "POST Create Instance Instance Id is not null:": (r) => JSON.parse(r.body).id != null
    });
    addErrorCount(success);

    if ((JSON.parse(res.body)).id != null) {
        instanceId = instances.findInstanceId(res.body);
    };

    //Test to get an instance by id from storage and validate the response
    res = instances.getInstanceById(runtimeToken, partyId, instanceId);
    success = check(res, {
        "GET Instance by Id status is 200:": (r) => r.status === 200,
        "CreatedBy of Instance is app owner:": (r) => JSON.parse(r.body).createdBy.toString().length === 9
    });
    addErrorCount(success);

    //Test to update the read status of an instance and validate the response
    res = instances.putUpdateReadStatus(runtimeToken, partyId, instanceId, "Read");
    success = check(res, {
        "PUT Update read status is 200:": (r) => r.status === 200,
        "Read status is updated as read:": (r) => JSON.parse(r.body).status.readStatus === "Read"
    });
    addErrorCount(success);

    //Test to get an instance of an app in a specific task from storage and validate the response
    res = instances.getAllinstancesByCurrentTask(runtimeToken, appOwner, level2App, "Task_1");
    success = check(res, {
        "GET Instance by Current task is 200:": (r) => r.status === 200,
        "Instances based on current task are retrieved:": (r) => JSON.parse(r.body).totalHits > 0,
        "Instance current task is task_1:": (r) => JSON.parse(r.body).instances[0].process.currentTask.elementId === "Task_1"
    });
    addErrorCount(success);

};
