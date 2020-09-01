/* Pre-reqisite for test: 
    1. MaskinPorteTokenGenerator https://github.com/Altinn/MaskinportenTokenGenerator built
    2. Installed appOwner certificate
    3. Send maskinporten token as environment variable after generating the token

    This test script sets complete confirmation as app owner on all the hard deleted instances of an app.
    example: k6 run -i 20 -u 10 /src/tests/platform/storage/appowner/completeconfirmation.js -e env=test -e org=ttd 
    -e level2app=rf-0002 -e subskey=*** -e maskinporten=token
*/

import { check } from "k6";
import { addErrorCount, printResponseToConsole } from "../../../../errorcounter.js";
import * as storageInstances from "../../../../api/storage/instances.js"
import { convertMaskinPortenToken } from "../../../../api/platform/authentication.js"
import * as setUpData from "../../../../setup.js";

const appOwner = __ENV.org;
const level2App = __ENV.level2app;
const maskinPortenToken = __ENV.maskinporten;
const createdDateTime = __ENV.createddate;

export const options = {
    thresholds: {
        "errors": ["count<1"]
    },
    setupTimeout: '5m'
};

//Function to authenticate a app owner, get all archived hardeleted and not complete confirmed instances of an app and return data
export function setup() {
    var altinnStudioRuntimeToken = convertMaskinPortenToken(maskinPortenToken, "true");
    var data = {};
    data.runtimeToken = altinnStudioRuntimeToken;
    var hardDeletedAppInstances = storageInstances.findAllHardDeletedInstances(altinnStudioRuntimeToken, appOwner, level2App, createdDateTime);
    data.instances = hardDeletedAppInstances;
    setUpData.clearCookies();
    return data;
};

export default function (data) {
    const runtimeToken = data["runtimeToken"];
    const instances = data.instances;

    var res, success, instancesCount;
    instancesCount = instances.length;


    if (instancesCount > 0) {
        for (var i = 0; i < instancesCount; i++) {
            
            //Get instance ids and separate party id and instance id    
            try {
                var instanceId = instances[i];
                instanceId = instanceId.split('/');
                var partyId = instanceId[0];
                instanceId = instanceId[1];
            } catch (error) {
                printResponseToConsole("Testdata missing", false, null);
            }

            //Complete confirm the app instance as an appOwner
            res = storageInstances.postCompleteConfirmation(runtimeToken, partyId, instanceId);
            success = check(res, {
                "Instance is confirmed complete:": (r) => r.status === 200
            });
            addErrorCount(success);
            printResponseToConsole("Instance is not confirmed complete:", success, res);
        };
    };
};
