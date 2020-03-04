import {Counter} from "k6/metrics";

let ErrorCount = new Counter("errors");

export function addErrorCount(success){
    if (!success){
        ErrorCount.add(1);
    };
};