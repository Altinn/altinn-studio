import { queriesMock } from 'app-shared/mocks/queriesMock';
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
import type { ILayoutSettings } from 'app-shared/types/global';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { ObjectUtils } from '@studio/pure-functions';

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

  it('Deletes the pdfLayoutName from settings.json if deleted layout was pdf', async () => {
    const { result } = renderDeleteLayoutMutation({
      pages: { order: [], pdfLayoutName: layout1NameMock },
    });
    await result.current.mutateAsync(layout1NameMock);
    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledWith(org, app, selectedLayoutSet, {
      pages: { order: [] },
    });
  });
});

const createFormLayoutSettingsMock = () => ObjectUtils.deepCopy(formLayoutSettingsMock);

const renderDeleteLayoutMutation = (
  layoutSettings: ILayoutSettings = createFormLayoutSettingsMock(),
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.FormLayouts, org, app, selectedLayoutSet],
    convertExternalLayoutsToInternalFormat(externalLayoutsMock),
  );
  queryClient.setQueryData(
    [QueryKey.FormLayoutSettings, org, app, selectedLayoutSet],
    layoutSettings,
  );
  return renderHookWithProviders(() => useDeleteLayoutMutation(org, app, selectedLayoutSet), {
    queryClient,
  });
};
