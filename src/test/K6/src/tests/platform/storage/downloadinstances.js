/* Pre-reqisite for test: 
    1. MaskinPorteTokenGenerator https://github.com/Altinn/MaskinportenTokenGenerator built
    2. Installed appOwner certificate
    3. Start local server to get maskinporten token. Refer readme file in github of MaskinPorteTokenGenerator
*/

import { check } from "k6";
import {addErrorCount, printResponseToConsole} from "../../../errorcounter.js";
import * as storageInstances from "../../../api/storage/instances.js"
import * as storageData from "../../../api/storage/data.js"
import {convertMaskinPortenToken} from "../../../api/platform/authentication.js"
import * as setUpData from "../../../setup.js";

let appOwner = __ENV.org;
let level2App = __ENV.level2app;
let maxIter = __ENV.maxiter;

export const options = {
    thresholds:{
        "errors": ["count<1"]
    }
};

//Function to authenticate a app owner, get all archived instances of an app and return data for the test
export function setup(){
    var maskinPortenToken = setUpData.generateMaskinPortenToken();
    var altinnStudioRuntimeToken = convertMaskinPortenToken(maskinPortenToken, "true");
    var data = {};
    data.runtimeToken = altinnStudioRuntimeToken;
    var archivedAppInstances = storageInstances.findAllArchivedInstances(altinnStudioRuntimeToken, appOwner, level2App);
    data.instances = archivedAppInstances;
    setUpData.clearCookies();
    return data;
};

export default function(data){
    const runtimeToken = data["runtimeToken"];
    const instances = data.instances;
    var uniqueNum = ((__VU * maxIter) - (maxIter) + (__ITER));
    uniqueNum = uniqueNum % instances.length;

    //Get instance ids and separate party id and instance id    
    var instanceId = instances[uniqueNum];
    instanceId = instanceId.split('/');
    var partyId = instanceId[0];
    instanceId = instanceId[1];

    //Get instance by id
    var res = storageInstances.getInstanceById(runtimeToken, partyId, instanceId);
    var success = check(res, {
        "Instance details are retrieved:": (r) => r.status === 200
      });
    addErrorCount(success);
    printResponseToConsole("Instance details are retrieved:", success, res);

    var dataElements = JSON.parse(res.body).data;
    //Loop through the dataelements under an instance and download instance
    for(var i = 0; i < dataElements.length; i++){
        res = storageData.getData(runtimeToken, partyId, instanceId, dataElements[i].id);
        success = check(res, {
            "Instance Data is downloaded:": (r) => r.status === 200
        });
        addErrorCount(success);       
        printResponseToConsole("Instance Data is not downloaded:", success, res);
    };

    //Confirm that all the dataelements are downloaded by the appOwner
    res = storageData.putConfirmDownloadAll(runtimeToken, partyId, instanceId);
    success = check(res, {
        "Instance Data download is confirmed:": (r) => r.status === 200
    });
    addErrorCount(success);    
    printResponseToConsole("Instance Data download is not confirmed:", success, res);

    //Complete confirm the app instance as an appOwner
    res = storageInstances.postCompleteConfirmation(runtimeToken, partyId, instanceId);
    success = check(res, {
        "Instance is confirmed complete:": (r) => r.status === 200
    });
    addErrorCount(success);    
    printResponseToConsole("Instance is not confirmed complete:", success, res);
};