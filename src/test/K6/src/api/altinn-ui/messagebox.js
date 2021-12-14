import * as config from '../../config.js';
import * as header from '../../buildrequestheaders.js';
import { httpGet } from '../../wrapper.js';

/**
 * Get request to load inbox for an user
 * @param {*} aspxauthCookie
 * @returns response with html of inbox
 */
export function loadAltinnInbox(aspxauthCookie) {
  var endpoint = config.altinnUi.inbox;
  var params = header.buildHeaderWithAspxAuth(aspxauthCookie, 'ui');
  return httpGet(endpoint, params);
}
