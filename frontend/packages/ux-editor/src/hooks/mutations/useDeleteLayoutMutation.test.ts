import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { formLayoutSettingsMock, renderHookWithProviders } from '../../testing/mocks';
import { useDeleteLayoutMutation } from './useDeleteLayoutMutation';
import {
  externalLayoutsMock,
  layout1NameMock,
  layout2NameMock,
} from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { convertExternalLayoutsToInternalFormat } from '../../utils/formLayoutsUtils';
import { appContextMock } from '../../testing/appContextMock';
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

  it('Selects a new layout when deleting the selected layout', async () => {
    const { result } = renderDeleteLayoutMutation();
    await result.current.mutateAsync(layout1NameMock);
    expect(appContextMock.setSelectedFormLayoutName).toHaveBeenCalledTimes(1);
    expect(appContextMock.setSelectedFormLayoutName).toHaveBeenCalledWith(layoutName);
  });

  it('Reloads preview when deleting a layout that is not selected', async () => {
    const { result } = renderDeleteLayoutMutation();
    await result.current.mutateAsync(layout2NameMock);
  });
});

const renderDeleteLayoutMutation = () => {
  queryClientMock.setQueryData(
    [QueryKey.FormLayouts, org, app, selectedLayoutSet],
    convertExternalLayoutsToInternalFormat(externalLayoutsMock),
  );
  queryClientMock.setQueryData(
    [QueryKey.FormLayoutSettings, org, app, selectedLayoutSet],
    formLayoutSettingsMock,
  );
  return renderHookWithProviders(() => useDeleteLayoutMutation(org, app, selectedLayoutSet));
};
