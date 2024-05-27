import { queriesMock } from 'app-shared/mocks/queriesMock';
import { formLayoutSettingsMock, renderHookWithProviders } from '../../testing/mocks';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { waitFor } from '@testing-library/react';
import type { UpdateLayoutOrderMutationArgs } from './useUpdateLayoutOrderMutation';
import { useUpdateLayoutOrderMutation } from './useUpdateLayoutOrderMutation';
import { layout1NameMock, layout2NameMock, layoutSet1NameMock } from '../../testing/layoutMock';
import { app, org } from '@studio/testing/testids';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;

describe('useUpdateLayoutOrderMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Moves layout down when direction is set to "down"', async () => {
    await renderAndWaitForData();

    const updateLayoutOrderResult = renderHookWithProviders(() =>
      useUpdateLayoutOrderMutation(org, app, selectedLayoutSet),
    ).result;

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

    const updateLayoutOrderResult = renderHookWithProviders(() =>
      useUpdateLayoutOrderMutation(org, app, selectedLayoutSet),
    ).result;

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
  const settingsResult = renderHookWithProviders(
    () => useFormLayoutSettingsQuery(org, app, selectedLayoutSet),
    { queries: { getFormLayoutSettings } },
  ).result;
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};
