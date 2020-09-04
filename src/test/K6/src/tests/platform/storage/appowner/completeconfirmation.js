/* Pre-reqisite for test: 
    1. MaskinPorteTokenGenerator https://github.com/Altinn/MaskinportenTokenGenerator built
    2. Installed appOwner certificate
    3. Send maskinporten token as environment variable after generating the token

    This test script sets complete confirmation as app owner on all the instances from a csv file.
    example: k6 run /src/tests/platform/storage/appowner/completeconfirmation.js -e env=test -e subskey=*** -e maskinporten=token
*/

import { check } from "k6";
import { addErrorCount, printResponseToConsole } from "../../../../errorcounter.js";
import * as storageInstances from "../../../../api/storage/instances.js"
import { convertMaskinPortenToken } from "../../../../api/platform/authentication.js"
import * as setUpData from "../../../../setup.js";
import Papa from "https://jslib.k6.io/papaparse/5.1.1/index.js";


const maskinPortenToken = __ENV.maskinporten;
const instancesCsvFile = open("../../../../data/instances.csv");

export const options = {
    thresholds: {
        "errors": ["count<1"]
    }
};

//Function to authenticate a app owner, get all archived hardeleted and not complete confirmed instances of an app and return data
export function setup() {
    var altinnStudioRuntimeToken = convertMaskinPortenToken(maskinPortenToken, "true");
    var data = {};
    data.runtimeToken = altinnStudioRuntimeToken;
    data.instances = (Papa.parse(instancesCsvFile)).data;
    setUpData.clearCookies();
    return data;
};

export default function (data) {
    const runtimeToken = data["runtimeToken"];
    const instances = data.instances;

    var res, success, instancesCount, partyId, instanceId;
    instancesCount = instances.length;

    if (instancesCount > 0) {
        for (var i = 0; i < instancesCount; i++) {
            //Get instance ids and separate party id and instance id    
            try {
                instanceId = instances[i].toString();
                instanceId = instanceId.split('/');
                partyId = instanceId[0];
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
