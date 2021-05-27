import http from 'k6/http';
import * as config from '../../../config.js';
import * as header from '../../../buildrequestheaders.js';

//Api call to Storage:Applications to get an app texts of a specific language and returns response
export function getAppTexts(altinnStudioRuntimeCookie, appOwner, appName, language) {
  var endpoint = config.platformStorage['applications'] + '/' + appOwner + '/' + appName + '/texts/' + language;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}

//Api call to Storage:Applications to POST upload app texts of a specific language and returns response
export function postAppTexts(altinnStudioRuntimeCookie, appOwner, appName, language) {
  var endpoint = config.platformStorage['applications'] + '/' + appOwner + '/' + appName + '/texts';
  var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie, 'platform');
  var requestBody = JSON.stringify(buildTextResourcesJson(appOwner, appName, language));
  return http.post(endpoint, requestBody, params);
}

//Api call to Storage:Applications to PUT Edit application texts and returns response code
export function putEditAppTexts(altinnStudioRuntimeCookie, appOwner, appName, language) {
  var endpoint = config.platformStorage['applications'] + '/' + appOwner + '/' + appName + '/texts/' + language;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  var requestBody = JSON.stringify(buildTextResourcesJson(appOwner, appName, language));
  return http.put(endpoint, requestBody, params);
}

//Api call to Storage:Applications to delete application texts and returns response code
export function deleteAppTexts(altinnStudioRuntimeCookie, appOwner, appName, language) {
  var endpoint = config.platformStorage['applications'] + '/' + appOwner + '/' + appName + '/texts/' + language;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.del(endpoint, null, params);
}

//Function that builds a sample text resources json
function buildTextResourcesJson(appOwner, appName, language) {
  var textResourceJson = '{}';
  var id = appOwner + '-' + appName + '-' + language;
  var textsResources = '[{ "id": "testid", "value": "testvalue" }]';
  textResourceJson = JSON.parse(textResourceJson);
  textResourceJson.id = id;
  textResourceJson.org = appOwner;
  textResourceJson.language = language;
  textResourceJson.resources = textsResources;
  return textResourceJson;
}
