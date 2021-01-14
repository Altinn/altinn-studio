/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run src/tests/platform/storage/instances.js -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=***
*/

import { check } from "k6";
import { addErrorCount } from "../../../errorcounter.js";
import * as instances from "../../../api/storage/instances.js"
import * as setUpData from "../../../setup.js";
import * as sbl from "../../../api/storage/messageboxinstances.js"

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

//Function to setup data and return AltinnstudioRuntime Token
export function setup() {
    var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
    setUpData.clearCookies();
    var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
    data.RuntimeToken = altinnStudioRuntimeCookie;
    return data;
};


//Tests for platform Storage: Instances
export default function(data) {
    const runtimeToken = data["RuntimeToken"];
    const partyId = data["partyId"];
    var instanceId = "";
    var res, success;

    //Test to create an instance with storage api and validate the response
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
        "GET Instance by Id status is 200:": (r) => r.status === 200
    });
    addErrorCount(success);

    //Test to get all instances for a party from storage and validate the response to have 200 as code
    res = instances.getAllinstancesByPartyId(runtimeToken, partyId);
    success = check(res, {
        "GET Instances by instanceOwner status is 200:": (r) => r.status === 200
    });
    addErrorCount(success);

    //Test to update the read status of an instance and validate the response
    res = instances.putUpdateReadStatus(runtimeToken, partyId, instanceId, "Read");
    success = check(res, {
        "PUT Update read status is 200:": (r) => r.status === 200,
        "Read status is updated as read:": (r) => JSON.parse(r.body).status.readStatus === "Read"
    });
    addErrorCount(success);

    //Test to soft delete an instance by id and validate the response code and response body to have the soft deleted date set
    res = instances.deleteInstanceById(runtimeToken, partyId, instanceId, "false");
    success = check(res, {
        "Soft DELETE Instance status is 200:": (r) => r.status === 200,
        "Soft DELETE date set to the instance:": (r) => JSON.parse(r.body).status.softDeleted != null
    });
    addErrorCount(success);

    sbl.deleteSblInstance(runtimeToken, partyId, instanceId, "true");
};