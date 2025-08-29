import { queriesMock } from 'app-shared/mocks/queriesMock';
import { formLayoutSettingsMock, renderHookWithMockStore } from '../../testing/mocks';
import type { AddLayoutMutationArgs } from './useAddLayoutMutation';
import { useAddLayoutMutation } from './useAddLayoutMutation';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { externalLayoutsMock } from '@altinn/ux-editor-v3/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';
import type { FormLayoutsResponseV3 } from 'app-shared/types/api';
import type { ILayoutSettings } from 'app-shared/types/global';
import { app, org } from '@studio/testing/testids';

// Test data:
const layoutName = 'layoutName';
const selectedLayoutSet = layoutSet1NameMock;
const defaultArgs: AddLayoutMutationArgs = { layoutName };

describe('useAddLayoutMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls saveFormLayoutV3 with new layout', async () => {
    await renderAndWaitForData();

    const addLayoutResult = renderHookWithMockStore()(() =>
      useAddLayoutMutation(org, app, selectedLayoutSet),
    ).renderHookResult.result;

    addLayoutResult.current.mutate(defaultArgs);

    await waitFor(() => expect(addLayoutResult.current.isSuccess).toBe(true));

    expect(queriesMock.saveFormLayoutV3).toHaveBeenLastCalledWith(
      org,
      app,
      layoutName,
      selectedLayoutSet,
      {
        layout: {
          $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
          data: {
            layout: [expect.objectContaining({ type: ComponentTypeV3.NavigationButtons })],
            hidden: undefined,
          },
        },
      },
    );
  });

  it('Calls saveFormLayoutV3 with new layout for receiptPage', async () => {
    await renderAndWaitForData();

    const addLayoutResult = renderHookWithMockStore()(() =>
      useAddLayoutMutation(org, app, selectedLayoutSet),
    ).renderHookResult.result;

    addLayoutResult.current.mutate({
      layoutName: formLayoutSettingsMock.receiptLayoutName,
      isReceipt: true,
    });

    await waitFor(() => expect(addLayoutResult.current.isSuccess).toBe(true));

    expect(queriesMock.saveFormLayoutV3).toHaveBeenLastCalledWith(
      org,
      app,
      formLayoutSettingsMock.receiptLayoutName,
      selectedLayoutSet,
      {
        layout: {
          $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
          data: {
            layout: [],
            hidden: undefined,
          },
        },
      },
    );
  });
});

const renderAndWaitForData = async () => {
  const getFormLayoutsV3 = jest
    .fn()
    .mockImplementation(() => Promise.resolve<FormLayoutsResponseV3>(externalLayoutsMock));
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve<ILayoutSettings>(formLayoutSettingsMock));
  const formLayoutsResult = renderHookWithMockStore(
    {},
    { getFormLayoutsV3 },
  )(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  const settingsResult = renderHookWithMockStore(
    {},
    { getFormLayoutSettings },
  )(() => useFormLayoutSettingsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};
