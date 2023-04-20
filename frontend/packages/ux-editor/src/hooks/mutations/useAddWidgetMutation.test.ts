import { queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { AddWidgetMutationArgs, useAddWidgetMutation } from './useAddWidgetMutation';
import { IWidget } from '../../types/global';
import { ComponentType } from '../../components';

// Test data:
const org = 'org';
const app = 'app';
const displayName = ComponentType.TextArea;
const widget: IWidget = {
  components: [],
  texts: [],
  displayName,
}
const defaultArgs: AddWidgetMutationArgs = { widget, position: 0 };

describe('useAddWidgetMutation', () => {
  it('Saves layout', async () => {
    const { result } = await renderAddWidgetMutation();
    await result.current.mutateAsync(defaultArgs);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
  });
});

const renderAddWidgetMutation = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  return renderHookWithMockStore()(() => useAddWidgetMutation(org, app)).renderHookResult;
}
