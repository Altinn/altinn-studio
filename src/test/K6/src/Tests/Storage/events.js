import { check, sleep } from "k6";
import * as instances from "../../Apicalls/Storage/instances.js"
import * as events from "../../Apicalls/Storage/events.js"
import * as sbl from "../../Apicalls/Storage/messageboxinstances.js"
import * as setUpData from "../../setup.js";
import {addErrorCount} from "../../errorcounter.js";

let appOwner = __ENV.org;
let level2App = __ENV.level2app;
let eventsJson = open("../../Data/events.json");
let instanceJson = open("../../Data/instance.json");

export const options = {
    thresholds:{
        "errors": ["rate<0.000001"]
    }
};

//Function to setup data and return AltinnstudioRuntime Token, instance and user details
export function setup(){
    var aspxauthCookie = setUpData.authenticateUser();    
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);    
    var data = setUpData.getUserData(altinnStudioRuntimeCookie);
    data.RuntimeToken = altinnStudioRuntimeCookie;    
    var instanceId = instances.postIntance(altinnStudioRuntimeCookie,  data["partyId"], appOwner, level2App, instanceJson);
    instanceId = instances.findInstanceId(instanceId.body);
    data.instanceId = instanceId;
    return data;
};


//Tests for platform Storage: Instance Events
export default function(data) {
    const runtimeToken = data["RuntimeToken"];
    const partyId = data["partyId"];
    const instanceId = data["instanceId"];
    var eventId = ""; 
    
    //Test to add an instance event to an instance with storage api and validate the response
    var res = events.postAddEvent(runtimeToken, partyId, instanceId, eventsJson);    
    var success = check(res, {
      "POST Add Event: status is 201": (r) => r.status === 201,
      "POST Add Event: Event Id is not null": (r) => (JSON.parse(r.body)).id != null
    });  
    addErrorCount(success);
    sleep(1);

    eventId = (JSON.parse(res.body)).id;   
    
    //Test to get an instance event by id from an instance with storage api and validate the response
    res = events.getEvent(runtimeToken, partyId, instanceId, eventId);    
    success = check(res, {
      "GET Instance Event: status is 200": (r) => r.status === 200      
    });  
    addErrorCount(success);
    sleep(1);

    //Test to get all instance events from an instance with storage api and validate the response
    res = events.getAllEvents(runtimeToken, partyId, instanceId);    
    success = check(res, {
      "GET All Instance Events: status is 200": (r) => r.status === 200      
    });  
    addErrorCount(success);
    sleep(1);

     //Test to get all instance events by type from an instance with storage api and validate the response
     res = events.getEventByType(runtimeToken, partyId, instanceId, "created");
     success = check(res, {
       "GET Instance Events by EventType: status is 200": (r) => r.status === 200      
     });  
     addErrorCount(success);
     sleep(1);

     //Test to delete all instance events from an instance with storage api and validate the response
    res = events.deleteEvent(runtimeToken, partyId, instanceId);    
    success = check(res, {
      "DELETE All Instance Events: status is 200": (r) => r.status === 200      
    });  
    addErrorCount(success);
    sleep(1);
};

//Delete the instance created
export function teardown(data){
  const runtimeToken = data["RuntimeToken"];
  const partyId = data["partyId"];    
  const instanceId = data["instanceId"];

  sbl.deleteSblInstance(runtimeToken, partyId, instanceId, "true");    
};