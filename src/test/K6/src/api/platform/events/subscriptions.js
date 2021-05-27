import http from 'k6/http';
import * as config from '../../../config.js';
import * as header from '../../../buildrequestheaders.js';

/**
 * Api call to platform events/subscriptions to create a subscription for an event
 * @param {*} altinnStudioRuntimeToken altinn token for authentication
 * @param {*} subject ssn or org number
 * @param {*} subjectType person or organisation
 * @returns JSON object with response headers, body and timings
 */
export function postSubscriptions(altinnStudioRuntimeToken, subject, subjectType, orgName, appName) {
  var endpoint = config.platformEvents['subscriptions'];
  var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeToken, 'platform');
  var subjectFilter = subjectType === 'person' ? `/person/${subject}` : `/organisation/${subject}`;
  var body = {
    endPoint: 'https://www.altinn.no/',
    sourceFilter: config.appApiBaseUrl(orgName, appName),
    alternativeSubjectFilter: subjectFilter,
    typeFilter: 'app.instance.created',
  };
  body = JSON.stringify(body);
  return http.post(endpoint, body, params);
}

/**
 * Get an event subscription by id and return the response
 * @param {*} altinnStudioRuntimeToken
 * @param {*} subscriptionId id created from the post call
 * @returns
 */
export function getSubscriptionById(altinnStudioRuntimeToken, subscriptionId) {
  var endpoint = `${config.platformEvents['subscriptions']}/${subscriptionId}`;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeToken, 'platform');
  return http.get(endpoint, params);
}

/**
 * Delete an event subscription by id and return the response
 * @param {*} altinnStudioRuntimeToken
 * @param {*} subscriptionId id created from the post call
 * @returns
 */
export function deleteSubscriptionById(altinnStudioRuntimeToken, subscriptionId) {
  var endpoint = `${config.platformEvents['subscriptions']}/${subscriptionId}`;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeToken, 'platform');
  return http.del(endpoint, null, params);
}
