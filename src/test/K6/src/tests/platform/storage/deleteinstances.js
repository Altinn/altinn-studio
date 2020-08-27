/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run src/tests/platform/storage/deleteinstances.js -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=***
*/

import { check } from "k6";
import * as sbl from "../../../api/storage/messageboxinstances.js"
import * as setUpData from "../../../setup.js";
import { addErrorCount } from "../../../errorcounter.js";

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

//Function to setup data and return AltinnstudioRuntime Token and user details
export function setup() {
    var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
    var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
    data.RuntimeToken = altinnStudioRuntimeCookie;
    setUpData.clearCookies();
    return data;
};

//Hard delete instances under a party id
export default function (data) {
    const runtimeToken = data["RuntimeToken"];
    const partyId = data["partyId"];    
    var res, success;
    var instancesCount = 0;

    do {
        //Find active instances under the party id to be deleted.
        res = sbl.getSblInstanceByParty(runtimeToken, partyId);
        success = check(res, {
            "GET SBL Instance by Party status is 200:": (r) => r.status === 200
        });
        addErrorCount(success);

        instancesCount = JSON.parse(res.body).length;

        //hard delete all the instances fetched
        if (instancesCount > 0) {
            sbl.hardDeleteManyInstances(runtimeToken, res.body, instancesCount);

            //Find more instances to loop through if instance count is > 0
            res = sbl.getSblInstanceByParty(runtimeToken, partyId);
            success = check(res, {
                "GET SBL Instance by Party status is 200:": (r) => r.status === 200
            });
            addErrorCount(success);

            instancesCount = JSON.parse(res.body).length;
        };

    } while (instancesCount > 0)
};
