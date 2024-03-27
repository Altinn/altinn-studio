import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../testing/mocks';
import { waitFor } from '@testing-library/react';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { useDeleteFormContainerMutation } from './useDeleteFormContainerMutation';
import { container1IdMock, externalLayoutsMock, layout1NameMock } from '../../testing/layoutMock';
import type { FormLayoutsResponse } from 'app-shared/types/api';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';
const id = container1IdMock;

describe('useDeleteFormContainerMutation', () => {
  it('Should save layout without deleted container', async () => {
    const { result } = await renderDeleteFormContainerMutation();
    await result.current.mutateAsync(id);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      selectedLayoutSet,
      expect.objectContaining({
        data: expect.objectContaining({
          layout: expect.not.arrayContaining([expect.objectContaining({ id })]),
        }),
      }),
    );
  });
});

const renderDeleteFormContainerMutation = async () => {
  const getFormLayouts = jest
    .fn()
    .mockImplementation(() => Promise.resolve<FormLayoutsResponse>(externalLayoutsMock));
  const formLayoutsResult = renderHookWithProviders(
    () => useFormLayoutsQuery(org, app, selectedLayoutSet),
    { queries: { getFormLayouts } },
  ).result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));

  const formLayoutsSettingsResult = renderHookWithProviders(() =>
    useFormLayoutSettingsQuery(org, app, selectedLayoutSet),
  ).result;
  await waitFor(() => expect(formLayoutsSettingsResult.current.isSuccess).toBe(true));

  return renderHookWithProviders(() => useDeleteFormContainerMutation(org, app, selectedLayoutSet));
};
