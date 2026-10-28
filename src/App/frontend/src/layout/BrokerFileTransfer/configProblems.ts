import { toOrgNumber } from 'src/layout/BrokerFileTransfer/brokerClient/orgIdentifier';
import type { Message } from 'src/layout/BrokerFileTransfer/messages';
import type { CompExternal } from 'src/layout/layout';

// Broker's limits for a file transfer's property list
const MAX_METADATA_ENTRIES = 10;
const MAX_METADATA_KEY_LENGTH = 50;

type StaticConfig = Pick<
  CompExternal<'BrokerFileTransfer'>,
  'resourceId' | 'hasCustomRecipients' | 'recipients' | 'metadata'
>;

// Mistakes the layout shows by itself; recipients from an expression are checked once evaluated
export function configProblems({ resourceId, hasCustomRecipients, recipients, metadata }: StaticConfig): Message[] {
  const problems: Message[] = [];
  if (!resourceId) {
    problems.push({ key: 'config_error.broker_file_transfer_no_resource', params: ['resourceId'] });
  }
  if (hasCustomRecipients && !Array.isArray(recipients)) {
    problems.push(...recipientProblems(splitRecipients(recipients ?? '')));
  }
  problems.push(...metadataProblems(Object.keys(metadata ?? {})));
  return problems;
}

export function splitRecipients(recipients: string): string[] {
  return recipients
    .split(',')
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}

export function recipientProblems(recipients: string[]): Message[] {
  if (recipients.length === 0) {
    return [{ key: 'config_error.broker_file_transfer_no_recipients', params: ['hasCustomRecipients', 'recipients'] }];
  }
  const invalidRecipients = recipients.filter((recipient) => !toOrgNumber(recipient));
  return invalidRecipients.length > 0
    ? [
        {
          key: 'config_error.broker_file_transfer_invalid_recipients',
          params: ['recipients', invalidRecipients.join(', ')],
        },
      ]
    : [];
}

function metadataProblems(keys: string[]): Message[] {
  const problems: Message[] = [];
  if (keys.length > MAX_METADATA_ENTRIES) {
    problems.push({
      key: 'config_error.broker_file_transfer_too_much_metadata',
      params: ['metadata', MAX_METADATA_ENTRIES, keys.length],
    });
  }
  const invalidKeys = keys.filter((key) => !key.trim() || key.length > MAX_METADATA_KEY_LENGTH);
  if (invalidKeys.length > 0) {
    problems.push({
      key: 'config_error.broker_file_transfer_invalid_metadata_keys',
      params: ['metadata', MAX_METADATA_KEY_LENGTH, invalidKeys.map((key) => `'${key}'`).join(', ')],
    });
  }
  return problems;
}
