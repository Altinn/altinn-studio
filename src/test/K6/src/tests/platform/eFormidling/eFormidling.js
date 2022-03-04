/*
    Command: docker-compose run k6 run /src/tests/platform/eformidling/eformidling.js -e env=*** -e operatoraccesskey=*** -e messageId=*** -e orgNo=***
*/
import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as eFormidling from '../../../api/platform/eFormidling/eFormidling.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const messageId = __ENV.messageId;
const orgNo = __ENV.orgNo;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
};

export default function () {
  var res = eFormidling.getStatuses('');
  var success = check(res, {
    'Get Statuses without messageId Status is 400': (r) => r.status === 400,
    'Validation of Get Statuses reponse body content': (r) => r.json('message').includes('Query parameter messageId is required'),
  });

  addErrorCount(success);

  var res = eFormidling.getStatuses(messageId);
  var success = check(res, {
    'Get Statuses with messageId Status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  var res = eFormidling.getConversation('');
  var success = check(res, {
    'Get Conversations without messageId Status is 400': (r) => r.status === 400,
    'Get Conversations response body informs what is missing': (r) => r.json('message').includes('Query parameter messageId is required'),
  });

  addErrorCount(success);

  var res = eFormidling.getConversation(messageId);
  var success = check(res, {
    'Get Conversations with messageId Status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  var res = eFormidling.getCapabilities(orgNo);
  var success = check(res, {
    'Get Capabilities for orgNo Status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  var res = eFormidling.checkHealth();
  var success = check(res, {
    'Check Health Status is 200': (r) => r.status === 200,
    'Integration point reports it is UP': (r) => r.json('status').includes('UP'),
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformEFormidling')] = generateJUnitXML(data, 'platform-eformidling');
  return result;
}
