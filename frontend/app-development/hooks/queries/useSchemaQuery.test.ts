import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { useSchemaQuery } from './useSchemaQuery';
import { renderHookWithMockStore } from '../../test/mocks';

// Test data:
const jsonModelPathWithSlash = '/App/models/model.schema.json';
const xsdModelPath = 'App/models/model.xsd';
const xsdModelPathWithSlash = '/' + xsdModelPath;
const getDatamodel = jest.fn().mockImplementation(() => Promise.resolve({}));
const addXsdFromRepo = jest.fn().mockImplementation(() => Promise.resolve({}));
const org = 'org';
const app = 'app';

describe('useDatamodelsMetadataQuery', () => {
  afterEach(jest.clearAllMocks);

  it('Calls getDatamodel with correct arguments when Json Schema', async () => {
    const { renderHookResult: { result } } = renderHookWithMockStore(
      {},
      { getDatamodel, addXsdFromRepo },
      createQueryClientMock(),
    )(() => useSchemaQuery(jsonModelPathWithSlash));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getDatamodel).toHaveBeenCalledTimes(1);
    expect(getDatamodel).toHaveBeenCalledWith(org, app, jsonModelPathWithSlash);
    expect(addXsdFromRepo).not.toHaveBeenCalled();
  });

  it('Calls addXsdFromRepo with correct arguments when XSD', async () => {
    const { renderHookResult: { result } } = renderHookWithMockStore(
      {},
      { getDatamodel, addXsdFromRepo },
      createQueryClientMock(),
    )(() => useSchemaQuery(xsdModelPathWithSlash));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(addXsdFromRepo).toHaveBeenCalledTimes(1);
    expect(addXsdFromRepo).toHaveBeenCalledWith(org, app, xsdModelPath);
    expect(getDatamodel).not.toHaveBeenCalled();
  });
});
