import { renderHookWithProviders } from '../testing/mocks';
import { useGetLayoutSetByName } from './useGetLayoutSetByName';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

describe('useGetLayoutSetByName', () => {
  it('should return undefined if layout-set name does not exist', () => {
    const { result } = renderUseGetLayoutSetByName('layout-set-name');
    expect(result.current).toBeUndefined();
  });
  it('should return entire layout-set if provided name does exist', () => {
    const { result } = renderUseGetLayoutSetByName('mocked-layout-set');
    expect(result.current).toStrictEqual({ id: 'mocked-layout-set', type: 'subform' });
  });
});

const renderUseGetLayoutSetByName = (name: string) => {
  const org = 'defaultOrg';
  const app = 'defaultApp';
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], {
    sets: [{ id: 'mocked-layout-set', type: 'subform' }],
  });
  return renderHookWithProviders(() => useGetLayoutSetByName({ name, org, app }), {
    queryClient,
  });
};
