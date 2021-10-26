import http from 'k6/http';
import * as config from '../../config.js';
import * as header from '../../buildrequestheaders.js';

/**
 * Get data tags from an data element
 * @param {String} altinnToken
 * @param {Number} partyId
 * @param {guid} instaceId
 * @param {guid} dataId
 * @param {String} appOwner
 * @param {String} appName
 * @returns response of the http get request
 */
export function getDataTags(altinnToken, partyId, instaceId, dataId, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instaceId, dataId, 'datatags');
  var params = header.buildHearderWithRuntime(altinnToken, 'app');
  return http.get(endpoint, params);
}

/**
 * Delete a data tag from a data element
 * @param {String} altinnToken
 * @param {Number} partyId
 * @param {guid} instaceId
 * @param {guid} dataId
 * @param {String} appOwner
 * @param {String} appName
 * @param {String} tag
 * @returns response of the http delete request
 */
export function deleteDataTags(altinnToken, partyId, instaceId, dataId, appOwner, appName, tag) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instaceId, dataId, 'datatags') + `/${tag}`;
  var params = header.buildHearderWithRuntime(altinnToken, 'app');
  return http.del(endpoint, null, params);
}

/**
 * POST request to create a data tag to a data element
 * @param {String} altinnToken
 * @param {Number} partyId
 * @param {guid} instaceId
 * @param {guid} dataId
 * @param {String} appOwner
 * @param {String} appName
 * @param {String} tag
 * @returns response of the http post request
 */
export function createDataTags(altinnToken, partyId, instaceId, dataId, appOwner, appName, tag) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls(partyId, instaceId, dataId, 'datatags');
  var params = header.buildHearderWithRuntimeandJson(altinnToken, 'app');
  var requestBody = JSON.stringify(tag);
  return http.post(endpoint, requestBody, params);
}
