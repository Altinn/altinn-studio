import { useValidDataModels } from './useValidDataModels';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../testing/mocks';
import { dataModelMetadataResponseMock } from '../testing/dataModelMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const defaultDataModel = 'defaultModel';
const secondDataModel = 'secondModel';

const getAppMetadataModelIdsMock = jest
  .fn()
  .mockImplementation(() => Promise.resolve([defaultDataModel, secondDataModel]));
const getDataModelMetadataMock = jest
  .fn()
  .mockImplementation(() => Promise.resolve(dataModelMetadataResponseMock));

const setupUseValidDataModelsHook = (defaultDataModel: string) => {
  return renderHookWithProviders(() => useValidDataModels(defaultDataModel), {
    queries: {
      getAppMetadataModelIds: getAppMetadataModelIdsMock,
      getDataModelMetadata: getDataModelMetadataMock,
    },
    queryClient: createQueryClientMock(),
  });
};

describe('useValidDataModels', () => {
  it('should return expected data', async () => {
    const { result } = setupUseValidDataModelsHook(defaultDataModel);

    expect(result.current.isLoadingDataModels).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoadingDataModels).toBe(false);
    });

    const { selectedDataModel, isDataModelValid, dataModels } = result.current;

    expect(isDataModelValid).toBe(true);
    expect(selectedDataModel).toEqual(defaultDataModel);
    expect(dataModels).toEqual([defaultDataModel, secondDataModel]);
  });

  it('should return default data model when current data model is not provided', async () => {
    const { result } = setupUseValidDataModelsHook('');

    expect(result.current.isLoadingDataModels).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoadingDataModels).toBe(false);
    });

    const { selectedDataModel, isDataModelValid } = result.current;
    expect(isDataModelValid).toBe(true);
    expect(selectedDataModel).toEqual(defaultDataModel);
  });
});
