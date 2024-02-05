import { renderHookWithMockStore } from '../../test/mocks';
import { removeDatamodelFromList, useDeleteDatamodelMutation } from './useDeleteDatamodelMutation';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { jsonSchemaMock } from '../../test/jsonSchemaMock';
import { waitFor } from '@testing-library/react';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';
import { isXsdFile } from 'app-shared/utils/filenameUtils';

const modelPath = 'modelPath';
const org = 'org';
const app = 'app';
const initialData: DatamodelMetadata[] = [
  {
    description: null,
    directory: 'directory',
    fileName: 'fileName',
    filePath: 'filePath',
    fileStatus: 'fileStatus',
    fileType: '.json',
    lastChanged: 'lastChanged',
    repositoryRelativeUrl: 'repositoryRelativeUrl',
    select: true,
  },
];

describe('useDeleteDatamodelMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Returns correct state with the correct parameters', async () => {
    const queryClient = createQueryClientMock();
    const deleteDatamodel = jest.fn();
    const {
      renderHookResult: { result },
    } = render({ deleteDatamodel });
    result.current.mutate({ modelPath, model: jsonSchemaMock });
    await waitFor(() => result.current.isPending);
    expect(
      queryClient.setQueryData(
        [QueryKey.DatamodelsJson, org, app],
        (oldData: DatamodelMetadata[] = initialData) => removeDatamodelFromList(oldData, modelPath),
      ),
    ).toEqual(initialData);
    expect(
      queryClient.setQueryData(
        [QueryKey.DatamodelsXsd, org, app],
        (oldData: DatamodelMetadata[] = initialData) => removeDatamodelFromList(oldData, modelPath),
      ),
    ).toEqual(initialData);
    await waitFor(() => result.current.isSuccess);
    expect(removeDatamodelFromList).toHaveBeenCalled;
  });

  it('Calls onSuccess correctly with mutate function', async () => {
    const queryClient = createQueryClientMock();
    const deleteDatamodel = jest.fn();
    const {
      renderHookResult: { result },
    } = render({ deleteDatamodel });
    result.current.mutate({ modelPath, model: jsonSchemaMock });
    await waitFor(() => result.current.isSuccess);
    queryClient.setQueryData([QueryKey.DatamodelsJson, org, app], initialData);
    queryClient.setQueryData([QueryKey.DatamodelsXsd, org, app], initialData);
    result.current.mutate({ modelPath, model: jsonSchemaMock });
    await waitFor(() => result.current.isSuccess);
    expect(
      queryClient.setQueryData(
        [QueryKey.DatamodelsJson, org, app],
        (oldData: DatamodelMetadata[] = initialData) => removeDatamodelFromList(oldData, modelPath),
      ),
    ).toEqual(initialData);
    expect(
      queryClient.setQueryData(
        [QueryKey.DatamodelsXsd, org, app],
        (oldData: DatamodelMetadata[] = initialData) => removeDatamodelFromList(oldData, modelPath),
      ),
    ).toEqual(initialData);
    expect(
      queryClient.removeQueries({ queryKey: [QueryKey.JsonSchema, org, app, modelPath] }),
    ).toEqual(undefined);

    const updatedXsdData = queryClient.getQueryData([QueryKey.DatamodelsXsd, org, app]);
    expect(updatedXsdData).toEqual(removeDatamodelFromList(initialData, modelPath));
  });

  it('Calls onSuccess', async () => {
    const queryClient = createQueryClientMock();
    const deleteDatamodel = jest.fn();
    const {
      renderHookResult: { result },
    } = render({ deleteDatamodel });
    result.current.mutate({ modelPath, model: jsonSchemaMock });
    await waitFor(() => result.current.isSuccess);
    queryClient.setQueryData([QueryKey.DatamodelsJson, org, app], initialData);
    queryClient.setQueryData([QueryKey.DatamodelsXsd, org, app], initialData);

    if (result.current.onSuccess) result.current.onSuccess(initialData, modelPath);
    expect(
      queryClient.setQueryData(
        [QueryKey.DatamodelsJson, org, app],
        (oldData: DatamodelMetadata[] = initialData) => removeDatamodelFromList(oldData, modelPath),
      ),
    ).toEqual(initialData);

    expect(
      queryClient.setQueryData(
        [QueryKey.DatamodelsXsd, org, app],
        (oldData: DatamodelMetadata[] = initialData) => removeDatamodelFromList(oldData, modelPath),
      ),
    ).toEqual(initialData);

    expect(
      queryClient.removeQueries({
        queryKey: [QueryKey.JsonSchema, org, app, { modelPath }],
      }),
    ).toEqual(undefined);
  });

  it('Calls onSuccess correctly', async () => {
    const queryClient = createQueryClientMock();
    const deleteDatamodel = jest.fn();
    const {
      renderHookResult: { result },
    } = render({ deleteDatamodel });
    result.current.mutate({ modelPath, model: jsonSchemaMock });
    await waitFor(() => result.current.isSuccess);
    queryClient.setQueryData([QueryKey.DatamodelsJson, org, app], initialData);
    queryClient.setQueryData([QueryKey.DatamodelsXsd, org, app], initialData);
    result.current.mutate({ modelPath, model: jsonSchemaMock });
    await waitFor(() => result.current.isSuccess);
    const respectiveFileNameInXsdOrJson = isXsdFile(modelPath)
      ? modelPath.replace('.xsd', '.schema.json')
      : modelPath.replace('.schema.json', '.xsd');
    expect(respectiveFileNameInXsdOrJson).toEqual('modelPath');
    expect(
      queryClient.removeQueries({
        queryKey: [QueryKey.JsonSchema, org, app, respectiveFileNameInXsdOrJson],
      }),
    ).toEqual(undefined);
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => renderHookWithMockStore({}, queries, queryClient)(() => useDeleteDatamodelMutation());
