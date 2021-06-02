import http from 'k6/http';
import * as config from '../../../config.js';
import * as header from '../../../buildrequestheaders.js';

//Api call to Platform:Storage to add an event to an instance
export function postAddEvent(altinnStudioRuntimeCookie, partyId, instanceId, eventData) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'events');
  var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie, 'platform');
  eventData = JSON.parse(eventData);
  eventData.instanceOwnerId = partyId;
  eventData.instanceId = partyId + '/' + instanceId;
  eventData = JSON.stringify(eventData);
  return http.post(endpoint, eventData, params);
}

//Api call to Platform:Storage to get all events from an instance
export function getAllEvents(altinnStudioRuntimeCookie, partyId, instanceId) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'events');
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}

//Api call to Platform:Storage to get events by type from an instance
export function getEventByType(altinnStudioRuntimeCookie, partyId, instanceId, eventTypes) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'events') + '?eventTypes=' + eventTypes;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}

//Api call to Platform:Storage to get events by id from an instance
export function getEvent(altinnStudioRuntimeCookie, partyId, instanceId, eventId) {
  var endpoint = config.buildStorageUrls(partyId, instanceId, '', 'events') + '/' + eventId;
  var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'platform');
  return http.get(endpoint, params);
}
