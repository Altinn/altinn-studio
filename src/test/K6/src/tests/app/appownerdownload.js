import { check, fail } from "k6";
import {addErrorCount} from "../../errorcounter.js";
import * as appInstances from "../../api/app/instances.js"
import * as appData from "../../api/app/data.js"
import {convertMaskinPortenToken} from "../../api/platform/authentication.js"
import * as setUpData from "../../setup.js";

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
    setUpData.clearCookies();
    return data;
};

export default function(data){
    const runtimeToken = data["runtimeToken"];
};