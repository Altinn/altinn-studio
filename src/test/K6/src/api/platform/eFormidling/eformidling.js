import http from 'k6/http';
import * as config from '../../../config.js';
import * as header from '../../../buildrequestheaders.js';

//Api call to integration point:Get Conversation for provided messageId
export function getConversation(messageId) {
  var endpoint = config.eFormidling['conversations'] + '?messageId=' + messageId;
  return http.get(endpoint);
}

//Api call to integration point:Get Capabilities for provided messageId
export function getCapabilities(id) {
  var endpoint = config.eFormidling['capabilities'] + '/' + id;
  return http.get(endpoint);
}

//Api call to integration point:Get Status for provided messageId
export function getStatuses(messageId) {
  var endpoint = config.eFormidling['statuses'] + '?messageId=' + messageId;
  return http.get(endpoint);
}

//Api call to integration point:Check Health for provided messageId
export function checkHealth() {
  var endpoint = config.eFormidling['health'];
  let params = header.addSubscriptionKey({}, __ENV.operatoraccesskey, 'platform');
  return http.get(endpoint, params);
}

