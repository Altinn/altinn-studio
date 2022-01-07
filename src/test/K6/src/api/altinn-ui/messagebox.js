import * as config from '../../config.js';
import { httpGet } from '../../wrapper.js';
import http from 'k6/http';

/**
 * Get request to load inbox for an user
 * @param {*} aspxauthCookie
 * @returns response with html of inbox
 */
export function loadAltinnInbox(aspxauthCookie, partyId) {
  var endpoint = config.altinnUi.inbox;
  var params = {
    cookies: { '.ASPXAUTH': aspxauthCookie, AltinnPartyId: partyId },
  };
  return httpGet(endpoint, params);
}

/**
 * Get request to search messagebox for an user with search criteria
 * @param {*} aspxauthCookie
 * @param {*} partyId
 * @param {*} searchCriteria
 * @returns response with html of search result
 */
export function searchMessageBox(aspxauthCookie, partyId, searchCriteria) {
  var endpoint = config.altinnUi.search;
  var params = {
    cookies: { '.ASPXAUTH': aspxauthCookie, AltinnPartyId: partyId },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  return http.request('GET', endpoint, searchCriteria, params);
}
