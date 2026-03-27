import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../../testing/mocks';
import { useDeleteContactPointMutation } from './useDeleteContactPointMutation';

const testOrg = 'ttd';
const contactPointId = 'cp-1';

const renderUseDeleteContactPointMutation = (queryClient = createQueryClientMock()) =>
  renderHookWithProviders(() => useDeleteContactPointMutation(testOrg), { queryClient });

describe('useDeleteContactPointMutation', () => {
  it('calls deleteContactPoint with the correct arguments', async () => {
    const { result } = renderUseDeleteContactPointMutation();
    await result.current.mutateAsync(contactPointId);
    expect(queriesMock.deleteContactPoint).toHaveBeenCalledWith(testOrg, contactPointId);
  });

  it('invalidates the contact points query on success', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderUseDeleteContactPointMutation(queryClient);
    await result.current.mutateAsync(contactPointId);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: [QueryKey.ContactPoints, testOrg] }),
    );
  });
});
