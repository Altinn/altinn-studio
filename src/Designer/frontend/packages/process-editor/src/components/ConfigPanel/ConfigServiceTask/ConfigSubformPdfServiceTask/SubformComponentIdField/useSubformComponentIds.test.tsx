import { renderHook, waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormLayoutsResponse } from 'app-shared/types/api/FormLayoutsResponse';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { mockBpmnDetails } from '../../../../../../test/mocks/bpmnDetailsMock';
import { createProviderWrapper } from '../../../../../../test/renderWithProviders';
import { useSubformComponentIds } from './useSubformComponentIds';

const subformDataType = 'subform-data';
const subformLayoutSetId = 'my-subform';
const taskLayoutSetId = mockBpmnDetails.id;

const layoutSets: LayoutSets = [
  { id: taskLayoutSetId, dataType: 'model' },
  { id: 'Task_1', dataType: 'model', taskId: 'Task_1' },
  { id: subformLayoutSetId, dataType: subformDataType, type: 'subform' },
];

const layoutsByLayoutSetId: Record<string, FormLayoutsResponse> = {
  [taskLayoutSetId]: createLayouts([
    { id: 'AnInput', type: ComponentType.Input },
    { id: 'TheSubformTable', type: ComponentType.Subform, layoutSet: subformLayoutSetId },
  ]),
  Task_1: createLayouts([
    { id: 'SubformTableInTheDataTask', type: ComponentType.Subform, layoutSet: subformLayoutSetId },
  ]),
};

const getFormLayouts = jest.fn((_org: string, _app: string, layoutSetName: string) =>
  Promise.resolve(layoutsByLayoutSetId[layoutSetName] ?? ({} as FormLayoutsResponse)),
);

describe('useSubformComponentIds', () => {
  afterEach(jest.clearAllMocks);

  it('offers only the subform components in the layout set named after the task', async () => {
    const { result } = renderUseSubformComponentIds(subformDataType);

    await waitFor(() => expect(result.current.subformComponentIds).toEqual(['TheSubformTable']));
    expect(getFormLayouts).toHaveBeenCalledTimes(1);
    expect(getFormLayouts).toHaveBeenCalledWith(org, app, taskLayoutSetId);
  });

  it('caches the untouched response under a key of its own', async () => {
    const queryClient = createQueryClientMock();
    const { result } = renderUseSubformComponentIds(subformDataType, queryClient);

    await waitFor(() => expect(result.current.subformComponentIds).toHaveLength(1));

    expect(
      queryClient.getQueryData([QueryKey.FormLayouts, org, app, taskLayoutSetId, 'external']),
    ).toEqual(layoutsByLayoutSetId[taskLayoutSetId]);
    expect(
      queryClient.getQueryData([QueryKey.FormLayouts, org, app, taskLayoutSetId]),
    ).toBeUndefined();
  });

  it('does not ask for the layout files before a data type is chosen', () => {
    const { result } = renderUseSubformComponentIds('');

    expect(getFormLayouts).not.toHaveBeenCalled();
    expect(result.current.subformComponentIds).toEqual([]);
  });

  it('does not ask for the layout files when no subform stores the chosen data type', () => {
    renderUseSubformComponentIds('unused-data');

    expect(getFormLayouts).not.toHaveBeenCalled();
  });
});

function createLayouts(layout: object[]): FormLayoutsResponse {
  return { Side1: { data: { layout } } } as unknown as FormLayoutsResponse;
}

const renderUseSubformComponentIds = (
  subformDataTypeId: string,
  queryClient = createQueryClientMock(),
) => {
  const wrapper = createProviderWrapper({
    bpmnApiContextProps: { layoutSets },
    queries: { getFormLayouts },
    queryClient,
  });

  return renderHook(() => useSubformComponentIds(subformDataTypeId), { wrapper });
};
