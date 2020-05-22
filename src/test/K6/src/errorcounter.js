import {Counter} from "k6/metrics";
import {fail} from "k6";

let ErrorCount = new Counter("errors");

//Adds a count to the error counter when value of success is false
export function addErrorCount(success){
    if (!success){
        ErrorCount.add(1);
    };
};

//Prints the test name with response code of the request when the success is false
export function printResponseToConsole(testName, success, res){
    if (!success && res != null){
        fail(testName + " Response code: "+ res.status);
    }else if(!success){
        fail(testName);
    };
};