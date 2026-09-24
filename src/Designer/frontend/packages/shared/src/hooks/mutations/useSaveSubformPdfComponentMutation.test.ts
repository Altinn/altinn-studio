import { app, org } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { SubformComponent } from 'app-shared/types/api/SubformComponent';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import {
  type SaveSubformPdfComponentMutationArgs,
  useSaveSubformPdfComponentMutation,
} from './useSaveSubformPdfComponentMutation';

const layoutSetId = 'Task_2';
const args: SaveSubformPdfComponentMutationArgs = {
  layoutSetId,
  componentId: 'subform-mopeder',
  sourceLayoutSetId: 'Task_1',
};
const subformComponents: SubformComponent[] = [
  {
    componentId: 'subform-mopeder',
    layoutSetId,
    layoutName: 'ServiceTask',
    subformLayoutSetId: 'moped-subform',
    subformDataTypeId: 'moped',
  },
];
const saveSubformPdfComponent = jest.fn().mockResolvedValue(subformComponents);

describe('useSaveSubformPdfComponentMutation', () => {
  afterEach(jest.clearAllMocks);

  it('sends the component to copy to the pages of the given layout set', async () => {
    const { result } = renderHookWithProviders(() => useSaveSubformPdfComponentMutation(org, app), {
      queries: { saveSubformPdfComponent },
    });

    await result.current.mutateAsync(args);

    expect(saveSubformPdfComponent).toHaveBeenCalledTimes(1);
    expect(saveSubformPdfComponent).toHaveBeenCalledWith(org, app, layoutSetId, {
      componentId: 'subform-mopeder',
      sourceLayoutSetId: 'Task_1',
    });
  });

  it('caches the subform components the response holds', async () => {
    const queryClient = createQueryClientMock();
    const { result } = renderHookWithProviders(() => useSaveSubformPdfComponentMutation(org, app), {
      queries: { saveSubformPdfComponent },
      queryClient,
    });

    await result.current.mutateAsync(args);

    expect(queryClient.getQueryData([QueryKey.SubformComponents, org, app])).toEqual(
      subformComponents,
    );
  });

  it('invalidates the layout sets and the layouts of the layout set it wrote to', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(() => useSaveSubformPdfComponentMutation(org, app), {
      queries: { saveSubformPdfComponent },
      queryClient,
    });

    await result.current.mutateAsync(args);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [QueryKey.LayoutSets, org, app] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QueryKey.FormLayouts, org, app, layoutSetId],
    });
  });
});
