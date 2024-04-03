import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { useSchemaQuery } from './useSchemaQuery';
import { renderHookWithMockStore } from '../../test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';

// Test data:
const jsonModelPathWithSlash = '/App/models/model.schema.json';
const xsdModelPath = 'App/models/model.xsd';
const xsdModelPathWithSlash = '/' + xsdModelPath;
const org = 'org';
const app = 'app';

describe('useSchemaQuery', () => {
  afterEach(jest.clearAllMocks);

  it('Calls getDatamodel with correct arguments when Json Schema', async () => {
    const {
      renderHookResult: { result },
    } = renderHookWithMockStore(
      {},
      {},
      createQueryClientMock(),
    )(() => useSchemaQuery(jsonModelPathWithSlash));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.getDatamodel).toHaveBeenCalledTimes(1);
    expect(queriesMock.getDatamodel).toHaveBeenCalledWith(org, app, jsonModelPathWithSlash);
    expect(queriesMock.addXsdFromRepo).not.toHaveBeenCalled();
  });

  it('Calls addXsdFromRepo with correct arguments when XSD', async () => {
    const {
      renderHookResult: { result },
    } = renderHookWithMockStore(
      {},
      {},
      createQueryClientMock(),
    )(() => useSchemaQuery(xsdModelPathWithSlash));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addXsdFromRepo).toHaveBeenCalledTimes(1);
    expect(queriesMock.addXsdFromRepo).toHaveBeenCalledWith(org, app, xsdModelPath);
    expect(queriesMock.getDatamodel).not.toHaveBeenCalled();
  });
});
