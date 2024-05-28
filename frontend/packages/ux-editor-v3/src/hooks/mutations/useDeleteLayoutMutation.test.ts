import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { formLayoutSettingsMock, renderHookWithMockStore } from '../../testing/mocks';
import { useDeleteLayoutMutation } from './useDeleteLayoutMutation';
import { externalLayoutsMock, layout2NameMock } from '@altinn/ux-editor-v3/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { convertExternalLayoutsToInternalFormat } from '../../utils/formLayoutsUtils';
import { app, org } from '@studio/testing/testids';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;
const layoutName = layout2NameMock;

describe('useDeleteLayoutMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls deleteFormLayout with the name of the layout to delete', async () => {
    const { result } = renderDeleteLayoutMutation();
    await result.current.mutateAsync(layoutName);
    expect(queriesMock.deleteFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      selectedLayoutSet,
    );
  });

  it('Calls deleteFormLayout with the name of the receipt layout when deleting custom receipt', async () => {
    const { result } = renderDeleteLayoutMutation();
    await result.current.mutateAsync(formLayoutSettingsMock.receiptLayoutName);
    expect(queriesMock.deleteFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteFormLayout).toHaveBeenCalledWith(
      org,
      app,
      formLayoutSettingsMock.receiptLayoutName,
      selectedLayoutSet,
    );
    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledWith(org, app, selectedLayoutSet, {
      ...formLayoutSettingsMock,
      receiptLayoutName: undefined,
    });
  });
});

const renderDeleteLayoutMutation = () => {
  queryClientMock.setQueryData(
    [QueryKey.FormLayouts, org, app, selectedLayoutSet],
    convertExternalLayoutsToInternalFormat(externalLayoutsMock).convertedLayouts,
  );
  queryClientMock.setQueryData(
    [QueryKey.FormLayoutSettings, org, app, selectedLayoutSet],
    formLayoutSettingsMock,
  );
  return renderHookWithMockStore()(() => useDeleteLayoutMutation(org, app, selectedLayoutSet))
    .renderHookResult;
};
