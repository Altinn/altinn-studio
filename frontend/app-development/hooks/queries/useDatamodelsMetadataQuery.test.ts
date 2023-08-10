import { renderHookWithProviders } from '../../../packages/schema-editor/test/renderHookWithProviders';
import { DatamodelMetadataJson, DatamodelMetadataXsd } from 'app-shared/types/DatamodelMetadata';
import { useDatamodelsMetadataQuery } from './useDatamodelsMetadataQuery';
import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

// Test data:
const jsonMetadata1: DatamodelMetadataJson = {
  description: null,
  directory: 'test/test',
  fileName: 'datamodel1.schema.json',
  filePath: 'test/test/datamodel1.schema.json',
  fileStatus: 'Default',
  fileType: '.json',
  lastChanged: '2021-09-09T12:00:00',
  repositoryRelativeUrl: '/App/models/datamodel1.schema.json',
};
const xsdMetadata1: DatamodelMetadataXsd = {
  description: null,
  directory: 'test/test',
  fileName: 'datamodel1.xsd',
  filePath: 'test/test/datamodel1.xsd',
  fileStatus: 'Default',
  fileType: '.xsd',
  lastChanged: '2021-09-09T12:00:00',
  repositoryRelativeUrl: '/App/models/datamodel1.xsd',
};
const xsdMetadata2: DatamodelMetadataXsd = {
  description: null,
  directory: 'test/test',
  fileName: 'datamodel2.xsd',
  filePath: 'test/test/datamodel2.xsd',
  fileStatus: 'Default',
  fileType: '.xsd',
  lastChanged: '2021-09-09T12:00:00',
  repositoryRelativeUrl: '/App/models/datamodel2.xsd',
};

describe('useDatamodelsMetadataQuery', () => {
  it('Returns a concatenated list of Json and Xsd metadata items', async () => {
    const { result } = renderHookWithProviders({
      queryClient: createQueryClientMock(),
      servicesContextProps: {
        getDatamodels: () => Promise.resolve([jsonMetadata1]),
        getDatamodelsXsd: () => Promise.resolve([xsdMetadata2]),
      },
    })(useDatamodelsMetadataQuery);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([jsonMetadata1, xsdMetadata2]);
  });

  it('Does not include Xsd files if there is a Json file with the same name', async () => {
    const { result } = renderHookWithProviders({
      queryClient: createQueryClientMock(),
      servicesContextProps: {
        getDatamodels: () => Promise.resolve([jsonMetadata1]),
        getDatamodelsXsd: () => Promise.resolve([xsdMetadata1, xsdMetadata2]),
      },
    })(useDatamodelsMetadataQuery);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([jsonMetadata1, xsdMetadata2]);
  });
});
