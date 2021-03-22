import { Counter } from "k6/metrics";
import { fail } from "k6";

let ErrorCount = new Counter("errors");

//Adds a count to the error counter when value of success is false
export function addErrorCount(success, response) {
    if (!success) {
        ErrorCount.add(1);
        if (response) logResponse(response);
    };
};

/**
 * Stops k6 iteration when success is false and prints test name with response code
 * @param {String} testName
 * @param {boolean} success 
 * @param {JSON} res 
 */
export function stopIterationOnFail(testName, success, res) {
    if (!success && res != null) {
        fail(testName + " Response code: " + res.status);
    } else if (!success) {
        fail(testName);
    };
};

/**
 * Log the stringified version of Json object from a k6 http request
 * @param {JSON} response 
 */
function logResponse(response) {
    console.log(JSON.stringify(response));
};
