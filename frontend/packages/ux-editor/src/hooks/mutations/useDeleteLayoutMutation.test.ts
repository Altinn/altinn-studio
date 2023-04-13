// Test data:
import { layout2NameMock, queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { DeleteLayoutMutationArgs, useDeleteLayoutMutation } from './useDeleteLayoutMutation';

const org = 'org';
const app = 'app';
const layoutName = layout2NameMock;
const defaultArgs: DeleteLayoutMutationArgs = {
  layoutName
};

describe('useDeleteLayoutMutation', () => {
  it('Calls deleteFormLayout with tha name of the layout to delete', async () => {
    const { result } = await renderDeleteLayoutMutation();
    await result.current.mutateAsync(defaultArgs);
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
