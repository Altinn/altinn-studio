import http from 'k6/http';
import * as config from '../../config.js';
import * as header from '../../buildrequestheaders.js';

//Api call to App Api:Texts to get app texts based on language
export function getAppTexts(altinnStudioRuntimeCookie, appOwner, appName, language) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.appResources['texts'] + language;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  return http.get(endpoint, params);
}
