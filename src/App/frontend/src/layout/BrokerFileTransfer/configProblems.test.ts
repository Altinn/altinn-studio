import { describe, expect, it } from 'vitest';

import { configProblems } from 'src/layout/BrokerFileTransfer/configProblems';

const valid = { resourceId: 'broker-resource' };

describe('configProblems', () => {
  it('finds nothing wrong with a resource and the default recipient', () => {
    expect(configProblems(valid)).toEqual([]);
  });

  it('requires the resource', () => {
    expect(configProblems({ resourceId: '' })).toEqual([
      { key: 'config_error.broker_file_transfer_no_resource', params: ['resourceId'] },
    ]);
  });

  it('requires recipients when they are specified', () => {
    expect(configProblems({ ...valid, hasCustomRecipients: true, recipients: ' , ' })).toEqual([
      { key: 'config_error.broker_file_transfer_no_recipients', params: ['hasCustomRecipients', 'recipients'] },
    ]);
  });

  it('names the recipients that are not organization numbers', () => {
    expect(configProblems({ ...valid, hasCustomRecipients: true, recipients: '991825827, 12345, abc' })).toEqual([
      { key: 'config_error.broker_file_transfer_invalid_recipients', params: ['recipients', '12345, abc'] },
    ]);
  });

  it('leaves recipients from an expression to be checked once evaluated', () => {
    expect(configProblems({ ...valid, hasCustomRecipients: true, recipients: ['dataModel', 'Recipients'] })).toEqual(
      [],
    );
  });

  it('ignores recipients that are not specified as used', () => {
    expect(configProblems({ ...valid, hasCustomRecipients: false, recipients: 'abc' })).toEqual([]);
  });

  it("keeps the metadata within Broker's limits", () => {
    const metadata = Object.fromEntries(Array.from({ length: 11 }, (_, index) => [`name${index}`, 'value']));
    expect(configProblems({ ...valid, metadata: { ...metadata, ' ': 'value', ['n'.repeat(51)]: 'value' } })).toEqual([
      { key: 'config_error.broker_file_transfer_too_much_metadata', params: ['metadata', 10, 13] },
      {
        key: 'config_error.broker_file_transfer_invalid_metadata_keys',
        params: ['metadata', 50, `' ', '${'n'.repeat(51)}'`],
      },
    ]);
  });
});
