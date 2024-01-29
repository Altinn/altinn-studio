import { queriesMock } from 'app-shared/mocks/queriesMock';
import { formLayoutSettingsMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { waitFor } from '@testing-library/react';
import type { UpdateLayoutOrderMutationArgs } from './useUpdateLayoutOrderMutation';
import { useUpdateLayoutOrderMutation } from './useUpdateLayoutOrderMutation';
import { layout1NameMock, layout2NameMock } from '../../testing/layoutMock';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';

describe('useUpdateLayoutOrderMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Moves layout down when direction is set to "down"', async () => {
    await renderAndWaitForData();

    const updateLayoutOrderResult = renderHookWithMockStore()(() =>
      useUpdateLayoutOrderMutation(org, app, selectedLayoutSet),
    ).renderHookResult.result;

    const args: UpdateLayoutOrderMutationArgs = {
      layoutName: layout1NameMock,
      direction: 'down',
    };
    await updateLayoutOrderResult.current.mutateAsync(args);

    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledWith(
      org,
      app,
      selectedLayoutSet,
      expect.objectContaining({
        pages: expect.objectContaining({
          order: [layout2NameMock, layout1NameMock],
        }),
      }),
    );
  });

  it('Moves layout up when direction is set to "up"', async () => {
    await renderAndWaitForData();

    const updateLayoutOrderResult = renderHookWithMockStore()(() =>
      useUpdateLayoutOrderMutation(org, app, selectedLayoutSet),
    ).renderHookResult.result;

    const args: UpdateLayoutOrderMutationArgs = {
      layoutName: layout2NameMock,
      direction: 'up',
    };
    await updateLayoutOrderResult.current.mutateAsync(args);

    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledWith(
      org,
      app,
      selectedLayoutSet,
      expect.objectContaining({
        pages: expect.objectContaining({
          order: [layout2NameMock, layout1NameMock],
        }),
      }),
    );
  });
});

const renderAndWaitForData = async () => {
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve(formLayoutSettingsMock));
  const settingsResult = renderHookWithMockStore(
    {},
    { getFormLayoutSettings },
  )(() => useFormLayoutSettingsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};
