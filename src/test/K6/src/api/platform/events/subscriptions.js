import {http} from "k6/http";
import * as config from "../../../config.js";
import * as header from "../../../buildrequestheaders.js"
import * as support from "../../../support.js";

/**
 * Api call to platform events/subscriptions to create a subscription for an event
 * @param {*} altinnStudioRuntimeToken altinn token for authentication
 * @returns JSON object with response headers, body and timings
 */
export function postSubscriptions(altinnStudioRuntimeToken, ssn) {
  var endpoint = config.platformEvents["subscriptions"];
  var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeToken, "platform");
  var body = {
  };
  body = JSON.stringify(body);
  return http.post(endpoint, body, params);
};
