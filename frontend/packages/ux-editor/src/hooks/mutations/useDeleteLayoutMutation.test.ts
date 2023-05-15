import { queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { useDeleteLayoutMutation } from './useDeleteLayoutMutation';
import { layout2NameMock } from '../../testing/layoutMock';

// Test data:
const org = 'org';
const app = 'app';
const layoutName = layout2NameMock;

describe('useDeleteLayoutMutation', () => {
  it('Calls deleteFormLayout with tha name of the layout to delete', async () => {
    const { result } = await renderDeleteLayoutMutation();
    await result.current.mutateAsync(layoutName);
    expect(queriesMock.deleteFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteFormLayout).toHaveBeenCalledWith(org, app, layoutName);
  });
});

const renderDeleteLayoutMutation = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app)).renderHookResult.result;
  const settingsResult = renderHookWithMockStore()(() => useFormLayoutSettingsQuery(org, app)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
  return renderHookWithMockStore()(() => useDeleteLayoutMutation(org, app)).renderHookResult;
}
