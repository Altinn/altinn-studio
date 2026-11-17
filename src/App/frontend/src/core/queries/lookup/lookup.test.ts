import { act, renderHook } from '@testing-library/react';

import { useOrganizationLookup, usePersonLookup } from 'src/core/queries/lookup';
import { createQueryTestWrapper } from 'src/test/queryTestUtils';

it('keeps lookup callbacks stable across renders while using the latest request inputs', async () => {
  const { wrapper, queries } = createQueryTestWrapper({
    queries: {
      fetchPerson: async () => ({ person: null, error: 'person_lookup.unknown_error' }),
      fetchOrg: async () => ({ org: null, error: 'organization_lookup.unknown_error' }),
    },
  });
  const { result, rerender } = renderHook(
    ({ ssn, name, orgNr }) => ({
      person: usePersonLookup(ssn, name),
      organization: useOrganizationLookup(orgNr),
    }),
    { wrapper, initialProps: { ssn: 'first-ssn', name: 'First', orgNr: 'first-org' } },
  );
  const personLookup = result.current.person.lookup;
  const orgLookup = result.current.organization.lookup;
  rerender({ ssn: 'second-ssn', name: 'Second', orgNr: 'second-org' });
  expect(result.current.person.lookup).toBe(personLookup);
  expect(result.current.organization.lookup).toBe(orgLookup);

  await act(async () => {
    await personLookup();
    await orgLookup();
  });
  expect(queries.fetchPerson).toHaveBeenCalledExactlyOnceWith('second-ssn', 'Second');
  expect(queries.fetchOrg).toHaveBeenCalledExactlyOnceWith('second-org');
});
