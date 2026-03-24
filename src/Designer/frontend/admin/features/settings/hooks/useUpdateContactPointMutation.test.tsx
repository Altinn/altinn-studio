import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../../testing/mocks';
import { useUpdateContactPointMutation } from './useUpdateContactPointMutation';
import type { ContactPointPayload } from 'app-shared/types/ContactPoint';

const testOrg = 'ttd';
const contactPointId = 'cp-1';

const payload: ContactPointPayload = {
  name: 'Test',
  isActive: false,
  environments: [],
  methods: [{ methodType: 'email', value: 'test@example.com' }],
};

const renderUseUpdateContactPointMutation = (queryClient = createQueryClientMock()) =>
  renderHookWithProviders(() => useUpdateContactPointMutation(testOrg), { queryClient });

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
