import { queriesMock } from 'app-shared/mocks/queriesMock';
import { formLayoutSettingsMock, renderHookWithProviders } from '../../testing/mocks';
import type { AddLayoutMutationArgs } from './useAddLayoutMutation';
import { useAddLayoutMutation } from './useAddLayoutMutation';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { ComponentType } from 'app-shared/types/ComponentType';
import { externalLayoutsMock } from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import type { FormLayoutsResponse } from 'app-shared/types/api';
import type { ILayoutSettings } from 'app-shared/types/global';
import { app, org } from '@studio/testing/testids';

// Test data:
const layoutName = 'layoutName';
const selectedLayoutSet = layoutSet1NameMock;
const defaultArgs: AddLayoutMutationArgs = { layoutName };

describe('useAddLayoutMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls saveFormLayout with new layout', async () => {
    await renderAndWaitForData();

    const addLayoutResult = renderHookWithProviders(() =>
      useAddLayoutMutation(org, app, selectedLayoutSet),
    ).result;

    addLayoutResult.current.mutate(defaultArgs);

    await waitFor(() => expect(addLayoutResult.current.isSuccess).toBe(true));

    expect(queriesMock.saveFormLayout).toHaveBeenLastCalledWith(
      org,
      app,
      layoutName,
      selectedLayoutSet,
      {
        componentIdsChange: undefined,
        layout: {
          $schema:
            'https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json',
          data: {
            layout: [expect.objectContaining({ type: ComponentType.NavigationButtons })],
            hidden: undefined,
          },
        },
      },
    );
  });
});

const renderAndWaitForData = async () => {
  const getFormLayouts = jest
    .fn()
    .mockImplementation(() => Promise.resolve<FormLayoutsResponse>(externalLayoutsMock));
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve<ILayoutSettings>(formLayoutSettingsMock));
  const formLayoutsResult = renderHookWithProviders(
    () => useFormLayoutsQuery(org, app, selectedLayoutSet),
    { queries: { getFormLayouts } },
  ).result;
  const settingsResult = renderHookWithProviders(
    () => useFormLayoutSettingsQuery(org, app, selectedLayoutSet),
    { queries: { getFormLayoutSettings } },
  ).result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};
