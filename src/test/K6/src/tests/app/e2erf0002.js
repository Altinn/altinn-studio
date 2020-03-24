import { check, sleep } from "k6";
import {addErrorCount} from "../../errorcounter.js";
import * as appInstances from "../../api/app/instances.js"
import * as appData from "../../api/app/data.js"
import * as appProcess from "../../api/app/process.js"
import * as platformInstances from "../../api/storage/instances.js"
import {postPartieslookup} from "../../api/platform/register.js"
import {deleteSblInstance} from "../../api/storage/messageboxinstances.js"
import * as setUpData from "../../setup.js";

let instanceFormDataXml = open("../../data/rf-0002.xml");
let users = JSON.parse(open("../../data/users.json"));

export const options = {
    thresholds:{
        "errors": ["count<1"]
    },
    vus: 100,
   /*  stages: [        
        { duration: '10m', target: 100 }
      ] */
    iterations: 100
};

//Tests for App API: RF-0002
export default function() {
    var aspxauthCookie = setUpData.authenticateUser(users[__VU - 1].username, users[__VU - 1].password);  
    const runtimeToken = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);    
    //var data = setUpData.getUserData(runtimeToken);
    setUpData.clearCookies();
    //var orgPartyId = postPartieslookup(runtimeToken, "OrgNo", data["orgNumber"])
    //data.orgPartyId = JSON.parse(orgPartyId.body).partyId;    
    const partyId = users[__VU - 1].partyid;  
    var instanceId = "";    
    var dataId = "";  
    sleep(1);

    //Test to create an instance with App api and validate the response
    instanceId = appInstances.postInstance(runtimeToken, partyId);
    var success = check(instanceId, {
        "E2E App POST Create Instance status is 201:": (r) => r.status === 201        
      });  
    addErrorCount(success);
    sleep(1);
    
    if (instanceId.status === 201){
        dataId = appData.findDataId(instanceId.body);
        instanceId = platformInstances.findInstanceId(instanceId.body); 

        //Test to edit a form data in an instance with App APi and validate the response
        var res = appData.putDataById(runtimeToken, partyId, instanceId, dataId, "default", instanceFormDataXml);
        success = check(res, {
            "E2E PUT Edit Data by Id status is 201:": (r) => r.status === 201        
        });  
        addErrorCount(success);
        sleep(1);    

        //Test to get validate instance and verify that validation of instance is ok
        res = appInstances.getValidateInstance(runtimeToken, partyId, instanceId);
        success = check(res, {
            "E2E App GET Validate Instance validation OK:": (r) => (JSON.parse(r.body)).length === 0     
        });  
        addErrorCount(success);
        sleep(1);

        //Test to get next process of an app instance again and verify response code  to be 200
        res = appProcess.getNextProcess(runtimeToken, partyId, instanceId);
        sleep(1);

        var nextElement = (JSON.parse(res.body))[0];

        //Test to move the process of an app instance to the next process element and verify response code to be 200
        res = appProcess.putNextProcess(runtimeToken, partyId, instanceId, nextElement);
        success = check(res, {
            "E2E App PUT Move process to Next element status is 200:": (r) => r.status === 200      
        });  
        addErrorCount(success);
        sleep(1);

        //Test to call get instance details and verify the presence of archived date
        res = appInstances.getInstanceById(runtimeToken, partyId, instanceId);    
        success = check(res, {
            "E2E App Instance is archived:": (r) => (JSON.parse(r.body)).status.archived != null
        }); 
        sleep(1);

        deleteSblInstance(runtimeToken, partyId, instanceId, "true");    
        sleep(1); 
    }else{
        console.log(__VU + "VU:" + users[__VU - 1].username);
        console.log(__VU + "/" + JSON.stringify(instanceId.status));
        console.log(__VU + "/" + JSON.stringify(instanceId.body));
    };   
};