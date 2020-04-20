import { check, fail } from "./node_modules/k6";
import {addErrorCount} from "../../errorcounter.js";
import * as storageInstances from "../../api/storage/instances.js"
import * as storageData from "../../api/storage/data.js"
import {convertMaskinPortenToken} from "../../api/platform/authentication.js"
import * as setUpData from "../../setup.js";

let appOwner = __ENV.org;
let level2App = __ENV.level2app;
//let instanceIds = JSON.parse(open("../../data/instances.json"));

export const options = {
    thresholds:{
        "errors": ["count<1"]
    }
};

//Function to authenticate a app owner and return data for the test
export function setup(){
    var maskinPortenToken = setUpData.generateMaskinPortenToken();
    var altinnStudioRuntimeToken = convertMaskinPortenToken(maskinPortenToken, "true");
    var data = {};
    data.runtimeToken = altinnStudioRuntimeToken;
    //var archivedAppInstances = storageInstances.findAllArchivedInstances(altinnStudioRuntimeToken, appOwner, level2App);
    setUpData.clearCookies();
    return data;
};

export default function(data){
    const runtimeToken = data["runtimeToken"]; 
    var maxIter = 10;
    var uniqueNum = ((__VU * maxIter) - (maxIter) + (__ITER));

   /*  //Get instance id from external file and separate party id and instance id
    var instanceId = instanceIds[uniqueNum];
    instanceId = instanceId.split('/');
    var partyId = instanceId[0];
    instanceId = instanceId[1];

    //Get instance by id
    var res = storageInstances.getInstanceById(runtimeToken, partyId, instanceId);
    if (res.status !== 200){
        fail("Instance details are not retrieved" + JSON.stringify(res));
    };

    var dataElements = JSON.parse(res.body); */
};