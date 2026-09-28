import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useBpmnMutation } from './useBpmnMutation';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import { QueryKey } from '../../types/QueryKey';
import { app, org } from '@studio/testing/testids';

describe('useBpmnMutation', () => {
  it('Calls updateBpmnXml with correct arguments and payload', async () => {
    const updateBpmnXml = jest.fn();
    const { result } = renderHookWithProviders(() => useBpmnMutation(org, app), {
      queries: { updateBpmnXml },
    });
    const form = new FormData();

    await result.current.mutateAsync({ form });

    expect(updateBpmnXml).toHaveBeenCalledTimes(1);
    expect(updateBpmnXml).toHaveBeenCalledWith(org, app, form);
  });

  it('Invalidates the layout sets, since a task id change renames its layout set in v9', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(() => useBpmnMutation(org, app), { queryClient });

    await result.current.mutateAsync({ form: new FormData() });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [QueryKey.LayoutSets, org, app] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QueryKey.LayoutSetsExtended, org, app],
    });
  });
});
