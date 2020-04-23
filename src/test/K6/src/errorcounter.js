import {Counter} from "k6/metrics";
import {fail} from "k6";

let ErrorCount = new Counter("errors");

export function addErrorCount(success){
    if (!success){
        ErrorCount.add(1);
    };
};

export function printResponseToConsole(testName, success, res){
    if (!success){
        fail(testName + " Response code: "+ res.status);
    };
};