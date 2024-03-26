import { queriesMock } from 'app-shared/mocks/queriesMock';
import { formLayoutSettingsMock, renderHookWithProviders } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { act, waitFor } from '@testing-library/react';
import type { UpdateLayoutNameMutationArgs } from './useUpdateLayoutNameMutation';
import { useUpdateLayoutNameMutation } from './useUpdateLayoutNameMutation';
import { layout1NameMock } from '../../testing/layoutMock';
import { appContextMock } from '../../testing/appContextMock';

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

    const updateLayoutNameResult = renderHookWithProviders(() =>
      useUpdateLayoutNameMutation(org, app, selectedLayoutSet),
    ).result;

    await act(() => updateLayoutNameResult.current.mutateAsync(args));

    expect(queriesMock.updateFormLayoutName).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateFormLayoutName).toHaveBeenCalledWith(
      org,
      app,
      oldName,
      newName,
      selectedLayoutSet,
    );

    expect(appContextMock.refetchLayouts).toHaveBeenCalledTimes(1);
    expect(appContextMock.refetchLayoutSettings).toHaveBeenCalledTimes(1);
  });
});

const renderAndWaitForData = async () => {
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve(formLayoutSettingsMock));
  const formLayoutsResult = renderHookWithProviders(() =>
    useFormLayoutsQuery(org, app, selectedLayoutSet),
  ).result;
  const settingsResult = renderHookWithProviders(
    () => useFormLayoutSettingsQuery(org, app, selectedLayoutSet),
    { queries: { getFormLayoutSettings } },
  ).result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};
