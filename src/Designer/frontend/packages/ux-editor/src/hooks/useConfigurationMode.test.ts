import { renderHookWithProviders } from '../testing/mocks';
import { useConfigurationMode } from './useConfigurationMode';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, layoutSet as layoutSetId, org } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UiFolderLayoutSetModel } from 'app-shared/types/api/dto/UiFolderLayoutSetModel';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';

const renderUseConfPageType = (
  layoutSets: UiFolderLayoutSetModel[],
  selectedLayoutSet: string = layoutSetId,
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSets);
  return renderHookWithProviders(() => useConfigurationMode(), {
    queryClient,
    uxEditorParams: { layoutSet: selectedLayoutSet },
  });
};

describe('useConfigurationMode', () => {
  it('returns undefined for a regular data task', () => {
    const { result } = renderUseConfPageType([
      { id: layoutSetId, dataType: '', type: '', taskType: 'data' },
    ]);
    expect(result.current).toBeUndefined();
  });

  it('returns "payment" when the task type is payment', () => {
    const { result } = renderUseConfPageType([
      { id: layoutSetId, dataType: '', type: '', taskType: 'payment' },
    ]);
    expect(result.current).toBe('payment');
  });

  it('returns "subform" when the layout set type is subform', () => {
    const { result } = renderUseConfPageType([{ id: layoutSetId, dataType: '', type: 'subform' }]);
    expect(result.current).toBe('subform');
  });

  it('returns "receipt" when the layout set is the custom receipt', () => {
    const { result } = renderUseConfPageType(
      [{ id: PROTECTED_TASK_NAME_CUSTOM_RECEIPT, dataType: '', type: '' }],
      PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
    );
    expect(result.current).toBe('receipt');
  });

  it('returns undefined when the selected layout set is not found', () => {
    const { result } = renderUseConfPageType([
      { id: 'other-set', dataType: '', type: '', taskType: 'payment' },
    ]);
    expect(result.current).toBeUndefined();
  });
});
