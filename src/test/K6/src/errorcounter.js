import { Counter } from 'k6/metrics';
import { fail } from 'k6';

let ErrorCount = new Counter('errors');

//Adds a count to the error counter when value of success is false
export function addErrorCount(success) {
  if (!success) {
    ErrorCount.add(1);
  }
}

/**
 * Stops k6 iteration when success is false and prints test name with response code
 * @param {String} testName
 * @param {boolean} success
 * @param {JSON} res
 */
export function stopIterationOnFail(testName, success, res) {
  if (!success && res != null) {
    fail(testName + ': Response code: ' + res.status);
  } else if (!success) {
    fail(testName);
  }
}
