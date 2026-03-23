import { renderHook } from '@testing-library/react';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useAddContactPointMutation } from './useAddContactPointMutation';
import type { ContactPointPayload } from 'app-shared/types/ContactPoint';

const testOrg = 'ttd';

const payload: ContactPointPayload = {
  name: 'Alice',
  isActive: true,
  methods: [{ methodType: 'email', value: 'alice@example.com' }],
};

const renderUseAddContactPointMutation = (queryClient = createQueryClientMock()) =>
  renderHook(() => useAddContactPointMutation(testOrg), {
    wrapper: ({ children }) => (
      <ServicesContextProvider {...queriesMock} client={queryClient}>
        {children}
      </ServicesContextProvider>
    ),
  });

describe('useAddContactPointMutation', () => {
  it('calls addContactPoint with the correct arguments', async () => {
    const { result } = renderUseAddContactPointMutation();
    await result.current.mutateAsync(payload);
    expect(queriesMock.addContactPoint).toHaveBeenCalledWith(testOrg, payload);
  });

  it('invalidates the contact points query on success', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderUseAddContactPointMutation(queryClient);
    await result.current.mutateAsync(payload);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: [QueryKey.ContactPoints, testOrg] }),
    );
  });
});
