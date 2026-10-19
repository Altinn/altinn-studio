import { lookupApi } from 'src/core/api-client/lookup.api';
import { httpGet } from 'src/utils/network/networking';

vi.mock('src/utils/network/networking');

it.each([
  {
    response: { success: true, organisationDetails: { orgNr: '043871668', name: 'Example' } },
    expected: { org: { orgNr: '043871668', name: 'Example' }, error: null },
  },
  {
    response: { success: false, organisationDetails: null },
    expected: { org: null, error: 'organization_lookup.validation_error_not_found' },
  },
  {
    response: { unexpected: true },
    expected: { org: null, error: 'organization_lookup.validation_invalid_response_from_server' },
  },
])('decodes an organization lookup response: $response', async ({ response, expected }) => {
  vi.mocked(httpGet).mockResolvedValue(response);
  expect(await lookupApi.fetchOrg('043871668')).toEqual(expected);
  expect(httpGet).toHaveBeenCalledWith(expect.stringContaining('/api/v1/lookup/organisation/043871668'));
});

it('translates a failed organization lookup request into a domain error', async () => {
  vi.mocked(httpGet).mockRejectedValue(new Error('network error'));
  expect(await lookupApi.fetchOrg('043871668')).toEqual({ org: null, error: 'organization_lookup.unknown_error' });
});
