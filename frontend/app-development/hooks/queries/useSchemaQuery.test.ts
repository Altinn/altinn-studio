import { waitFor } from '@testing-library/react';
import { useSchemaQuery } from './useSchemaQuery';
import { renderHookWithProviders } from '../../test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';

// Test data:
const jsonModelPathWithSlash = '/App/models/model.schema.json';
const xsdModelPath = 'App/models/model.xsd';
const xsdModelPathWithSlash = '/' + xsdModelPath;

describe('useSchemaQuery', () => {
  afterEach(jest.clearAllMocks);

  it('Calls getDataModel with correct arguments when Json Schema', async () => {
    const { result } = renderHookWithProviders(() => useSchemaQuery(jsonModelPathWithSlash));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.getDataModel).toHaveBeenCalledTimes(1);
    expect(queriesMock.getDataModel).toHaveBeenCalledWith(org, app, jsonModelPathWithSlash);
    expect(queriesMock.addXsdFromRepo).not.toHaveBeenCalled();
  });

  it('Calls addXsdFromRepo with correct arguments when XSD', async () => {
    const { result } = renderHookWithProviders(() => useSchemaQuery(xsdModelPathWithSlash));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addXsdFromRepo).toHaveBeenCalledTimes(1);
    expect(queriesMock.addXsdFromRepo).toHaveBeenCalledWith(org, app, xsdModelPath);
    expect(queriesMock.getDataModel).not.toHaveBeenCalled();
  });
});
