/* Pre-reqisite for test: 
    1. MaskinPorteTokenGenerator https://github.com/Altinn/MaskinportenTokenGenerator built
    2. Installed appOwner certificate
    3. Send maskinporten token as environment variable after generating the token

    This test script can only be run with virtual users and iterations count and not based on duration.
    example: k6 run -i 20 -u 10 /src/tests/platform/storage/appowner/downloadinstances.js -e env=test -e org=ttd 
    -e level2app=rf-0002 -e subskey=*** -e maskinporten=token
*/

import { check } from "k6";
import { addErrorCount, printResponseToConsole } from "../../../errorcounter.js";
import * as storageInstances from "../../../api/storage/instances.js"
import * as storageData from "../../../api/storage/data.js"
import { convertMaskinPortenToken } from "../../../api/platform/authentication.js"
import * as setUpData from "../../../setup.js";

const appOwner = __ENV.org;
const level2App = __ENV.level2app;
const maskinPortenToken = __ENV.maskinporten;
const createdDateTime = __ENV.createddate;

export const options = {
    thresholds: {
        "errors": ["count<1"]
    },
    setupTimeout: '3m'
};

//Function to authenticate a app owner, get all archived instances of an app and return data for the test
export function setup() {
    var altinnStudioRuntimeToken = convertMaskinPortenToken(maskinPortenToken, "true");
    var data = {};
    var maxVus = (options.vus) ? options.vus : 1;
    var totalIterations = (options.iterations) ? options.iterations : 1;
    data.maxIter = Math.floor(totalIterations / maxVus); //maximum iteration per vu
    data.runtimeToken = altinnStudioRuntimeToken;
    var archivedAppInstances = storageInstances.findAllArchivedInstances(altinnStudioRuntimeToken, appOwner, level2App, totalIterations, createdDateTime);
    archivedAppInstances = setUpData.shuffle(archivedAppInstances);
    data.instances = archivedAppInstances;
    setUpData.clearCookies();
    return data;
};

export default function (data) {
    const runtimeToken = data["runtimeToken"];
    const instances = data.instances;
    var maxIter = data.maxIter;
    var uniqueNum = ((__VU * maxIter) - (maxIter) + (__ITER));
    uniqueNum = (uniqueNum > instances.length) ? (Math.floor(uniqueNum % instances.length)) : uniqueNum;
    var res, success;

    //Get instance ids and separate party id and instance id    
    try {
        var instanceId = instances[uniqueNum];
        instanceId = instanceId.split('/');
        var partyId = instanceId[0];
        instanceId = instanceId[1];
    } catch (error) {
        printResponseToConsole("Testdata missing", false, null);
    }

    //Get instance by id
    res = storageInstances.getInstanceById(runtimeToken, partyId, instanceId);
    success = check(res, {
        "Instance details are retrieved:": (r) => r.status === 200
    });
    addErrorCount(success);
    printResponseToConsole("Instance details are retrieved:", success, res);

    try {
        var dataElements = JSON.parse(res.body).data;
    } catch (error) {
        printResponseToConsole("DataElements not retrieved:", false, null);
    };

    //Loop through the dataelements under an instance and download instance
    for (var i = 0; i < dataElements.length; i++) {
        res = storageData.getData(runtimeToken, partyId, instanceId, dataElements[i].id);
        success = check(res, {
            "Instance Data is downloaded:": (r) => r.status === 200
        });
        addErrorCount(success);
        printResponseToConsole("Instance Data is not downloaded:", success, res);
    };

    //Complete confirm the app instance as an appOwner
    res = storageInstances.postCompleteConfirmation(runtimeToken, partyId, instanceId);
    success = check(res, {
        "Instance is confirmed complete:": (r) => r.status === 200
    });
    addErrorCount(success);
    printResponseToConsole("Instance is not confirmed complete:", success, res);
};