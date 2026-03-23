import { renderHook } from '@testing-library/react';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useUpdateContactPointMutation } from './useUpdateContactPointMutation';
import type { ContactPointPayload } from 'app-shared/types/ContactPoint';

const testOrg = 'ttd';
const contactPointId = 'cp-1';

const payload: ContactPointPayload = {
  name: 'Alice',
  isActive: false,
  methods: [{ methodType: 'email', value: 'alice@example.com' }],
};

const renderUseUpdateContactPointMutation = (queryClient = createQueryClientMock()) =>
  renderHook(() => useUpdateContactPointMutation(testOrg), {
    wrapper: ({ children }) => (
      <ServicesContextProvider {...queriesMock} client={queryClient}>
        {children}
      </ServicesContextProvider>
    ),
  });

describe('useUpdateContactPointMutation', () => {
  it('calls updateContactPoint with the correct arguments', async () => {
    const { result } = renderUseUpdateContactPointMutation();
    await result.current.mutateAsync({ id: contactPointId, payload });
    expect(queriesMock.updateContactPoint).toHaveBeenCalledWith(testOrg, contactPointId, payload);
  });

  it('invalidates the contact points query on success', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderUseUpdateContactPointMutation(queryClient);
    await result.current.mutateAsync({ id: contactPointId, payload });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: [QueryKey.ContactPoints, testOrg] }),
    );
  });
});
