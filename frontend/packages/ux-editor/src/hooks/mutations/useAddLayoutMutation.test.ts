import { queriesMock, formLayoutSettingsMock, renderHookWithMockStore } from '../../testing/mocks';
import { AddLayoutMutationArgs, useAddLayoutMutation } from './useAddLayoutMutation';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { ComponentType } from 'app-shared/types/ComponentType';

// Test data:
const org = 'org';
const app = 'app';
const layoutName = 'layoutName';
const selectedLayoutSet = 'test-layout-set';
const defaultArgs: AddLayoutMutationArgs = { layoutName }

describe('useAddLayoutMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls saveFormLayout with new layout', async () => {
    await renderAndWaitForData();

    const addLayoutResult = renderHookWithMockStore()(() => useAddLayoutMutation(org, app, selectedLayoutSet))
      .renderHookResult
      .result;

    addLayoutResult.current.mutate(defaultArgs);

    await waitFor(() => expect(addLayoutResult.current.isSuccess).toBe(true));

    expect(queriesMock.saveFormLayout).toHaveBeenLastCalledWith(
      org,
      app,
      layoutName,
      selectedLayoutSet,
      {
        $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
        data: {
          layout: [expect.objectContaining({ componentType: ComponentType.NavigationButtons })],
          hidden: undefined,
        }
      }
    );
  });

  it('Calls saveFormLayout with new layout for receiptPage', async () => {
    await renderAndWaitForData();

    const addLayoutResult = renderHookWithMockStore()(() => useAddLayoutMutation(org, app, selectedLayoutSet))
      .renderHookResult
      .result;

    addLayoutResult.current.mutate({ layoutName: formLayoutSettingsMock.receiptLayoutName, isReceipt: true });

    await waitFor(() => expect(addLayoutResult.current.isSuccess).toBe(true));

    expect(queriesMock.saveFormLayout).toHaveBeenLastCalledWith(
      org,
      app,
      formLayoutSettingsMock.receiptLayoutName,
      selectedLayoutSet,
      {
        $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
        data: {
          layout: [],
          hidden: undefined,
        }
      }
    );
  });
});

const renderAndWaitForData = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  const settingsResult = renderHookWithMockStore()(() => useFormLayoutSettingsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
}
