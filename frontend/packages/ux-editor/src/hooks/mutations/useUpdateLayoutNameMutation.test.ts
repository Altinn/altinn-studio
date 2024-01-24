import { queriesMock } from 'app-shared/mocks/queriesMock';
import { formLayoutSettingsMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { waitFor } from '@testing-library/react';
import type { UpdateLayoutNameMutationArgs } from './useUpdateLayoutNameMutation';
import { useUpdateLayoutNameMutation } from './useUpdateLayoutNameMutation';
import { layout1NameMock } from '../../testing/layoutMock';

// Test data:
const org = 'org';
const app = 'app';
const newName = 'newName';
const oldName = layout1NameMock;
const selectedLayoutSet = 'test-layout-set';
const args: UpdateLayoutNameMutationArgs = { newName, oldName };

describe('useUpdateLayoutNameMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Updates layout name', async () => {
    await renderAndWaitForData();

    const updateLayoutNameResult = renderHookWithMockStore()(() =>
      useUpdateLayoutNameMutation(org, app, selectedLayoutSet),
    ).renderHookResult.result;

    await updateLayoutNameResult.current.mutateAsync(args);

    expect(queriesMock.updateFormLayoutName).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateFormLayoutName).toHaveBeenCalledWith(
      org,
      app,
      oldName,
      newName,
      selectedLayoutSet,
    );
  });
});

const renderAndWaitForData = async () => {
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve(formLayoutSettingsMock));
  const formLayoutsResult = renderHookWithMockStore()(() =>
    useFormLayoutsQuery(org, app, selectedLayoutSet),
  ).renderHookResult.result;
  const settingsResult = renderHookWithMockStore(
    {},
    { getFormLayoutSettings },
  )(() => useFormLayoutSettingsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};
