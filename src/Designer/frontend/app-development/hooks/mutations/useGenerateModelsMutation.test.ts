import { renderHookWithProviders } from '../../test/mocks';
import { useGenerateModelsMutation } from './useGenerateModelsMutation';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { jsonSchemaMock } from '../../test/jsonSchemaMock';
import { waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';

// Test data:
const modelPath = 'modelPath';

describe('useGenerateModelsMutation', () => {
  it('Calls generateModels with the given model', async () => {
    const generateModels = jest.fn();
    const {
      renderHookResult: { result },
    } = render({ generateModels });
    result.current.mutate(jsonSchemaMock);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(generateModels).toHaveBeenCalledTimes(1);
    expect(generateModels).toHaveBeenCalledWith(org, app, modelPath, jsonSchemaMock);
  });

  it('Leaves combinations without subschemas out of the generated model', async () => {
    const generateModels = jest.fn();
    const text = { type: 'string' };
    const model = { type: 'object', properties: { text, combination: { anyOf: [] } } };
    const {
      renderHookResult: { result },
    } = render({ generateModels });
    result.current.mutate(model);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(generateModels).toHaveBeenCalledWith(org, app, modelPath, {
      type: 'object',
      properties: { text },
    });
  });
});

const render = (queries: Partial<ServicesContextProps> = {}) =>
  renderHookWithProviders(queries)(() => useGenerateModelsMutation(modelPath));
