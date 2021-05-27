import http from 'k6/http';
import * as config from '../../../config.js';
import * as header from '../../../buildrequestheaders.js';
import * as support from '../../../support.js';

/**
 * Api call to platform events to add a cloud event
 * @param {*} altinnStudioRuntimeToken altinn token for authentication
 * @returns JSON object with response headers, body and timings
 */
export function postEvents(altinnStudioRuntimeToken) {
  var endpoint = config.platformEvents['events'];
  var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeToken, 'platform');
  var body = [
    {
      id: '24f6554b-6e23-4132-9a72-0ac3c91478d3',
      specversion: '1.0',
      type: 'app.test.event',
      time: '2020-10-23T09:10:10.455896Z',
    },
  ];
  body = JSON.stringify(body);
  return http.post(endpoint, body, params);
}

/**
 * API call to platform events to retrieve events based on party with filter parameters and returns response
 * @param {string} altinnStudioRuntimeToken altinn token for authentication
 * @param {JSON} filterParameters
 */
export function getEventsByparty(altinnStudioRuntimeToken, filterParameters) {
  var endpoint = config.platformEvents['eventsByParty'];
  endpoint += filterParameters != null ? support.buildQueryParametersForEndpoint(filterParameters) : '';
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeToken, 'platform');
  return http.get(endpoint, params);
}

/**
 * API call to platform events to retrieve events by org/app name with filter parameters and returns response
 * @param {string} altinnStudioRuntimeToken altinn token for authentication
 * @param {string} appOwner Name of the app owner
 * @param {string} appName Name of the app
 * @param {JSON} filterParameters
 */
export function getEvents(altinnStudioRuntimeToken, appOwner, appName, filterParameters) {
  var endpoint = config.platformEvents['events'] + appOwner + '/' + appName;
  endpoint += filterParameters != null ? support.buildQueryParametersForEndpoint(filterParameters) : '';
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeToken, 'platform');
  return http.get(endpoint, params);
}
