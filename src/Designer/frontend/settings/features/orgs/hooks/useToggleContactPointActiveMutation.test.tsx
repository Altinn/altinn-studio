import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../../testing/mocks';
import { useToggleContactPointActiveMutation } from './useToggleContactPointActiveMutation';

const testOrg = 'ttd';
const contactPointId = 'cp-1';

const renderUseToggleContactPointActiveMutation = (queryClient = createQueryClientMock()) =>
  renderHookWithProviders(() => useToggleContactPointActiveMutation(testOrg), { queryClient });

describe('useToggleContactPointActiveMutation', () => {
  it('calls toggleContactPointActive with the correct arguments', async () => {
    const { result } = renderUseToggleContactPointActiveMutation();
    await result.current.mutateAsync({ id: contactPointId, isActive: false });
    expect(queriesMock.toggleContactPointActive).toHaveBeenCalledWith(
      testOrg,
      contactPointId,
      false,
    );
  });

  it('invalidates the contact points query on success', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderUseToggleContactPointActiveMutation(queryClient);
    await result.current.mutateAsync({ id: contactPointId, isActive: false });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: [QueryKey.ContactPoints, testOrg] }),
    );
  });
});
