import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import type * as ReactToastify from 'react-toastify';
import { FeatureFlag } from '@designer/feature-flags';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { useGenerateDataModelsBeforeShare } from './useGenerateDataModelsBeforeShare';

vi.mock('react-toastify', async (importOriginal) => ({
  ...(await importOriginal<typeof ReactToastify>()),
  toast: { error: vi.fn() },
}));

const dataModel = (name: string): DataModelMetadataJson => ({
  description: null,
  directory: 'App/models',
  fileName: `${name}.schema.json`,
  filePath: `App/models/${name}.schema.json`,
  fileStatus: 'Default',
  fileType: '.json',
  lastChanged: '',
  repositoryRelativeUrl: `/App/models/${name}.schema.json`,
});

const newV9App = {
  getAppVersion: vi.fn().mockResolvedValue({ backendVersion: '9.0.0', frontendVersion: '9.0.0' }),
  getAppMetadata: vi.fn().mockResolvedValue({
    id: 'org/app',
    org: 'org',
    created: '2026-12-01T00:00:00Z',
  } satisfies ApplicationMetadata),
};

describe('useGenerateDataModelsBeforeShare', () => {
  beforeEach(() => vi.mocked(toast.error).mockClear());

  it('generates only the data models whose C# model is out of date', async () => {
    const generateModels = vi.fn().mockResolvedValue(undefined);
    const schema = { properties: {} };
    const generateBeforeShare = await getGenerateBeforeShare({
      getDataModelsJson: vi.fn().mockResolvedValue([dataModel('stale'), dataModel('fresh')]),
      getDataModelGenerationStatus: vi.fn((_org, _app, modelPath: string) =>
        Promise.resolve(modelPath.includes('stale')),
      ),
      getDataModel: vi.fn().mockResolvedValue(schema),
      generateModels,
    });

    await generateBeforeShare();

    expect(generateModels).toHaveBeenCalledTimes(1);
    expect(generateModels).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      '/App/models/stale.schema.json',
      schema,
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('goes on with the other data models and tells the user when one cannot be generated', async () => {
    const generateModels = vi.fn((_org, _app, modelPath: string) =>
      modelPath.includes('broken') ? Promise.reject(new Error('failed')) : Promise.resolve(),
    );
    const generateBeforeShare = await getGenerateBeforeShare({
      getDataModelsJson: vi.fn().mockResolvedValue([dataModel('broken'), dataModel('other')]),
      getDataModelGenerationStatus: vi.fn().mockResolvedValue(true),
      getDataModel: vi.fn().mockResolvedValue({}),
      generateModels,
    });

    await generateBeforeShare();

    expect(generateModels).toHaveBeenCalledTimes(2);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('does nothing for apps the builder is not available for', async () => {
    // Created before the builder was offered.
    const getAppMetadata = vi
      .fn()
      .mockResolvedValue({ id: 'org/app', org: 'org', created: '2025-01-01T00:00:00Z' });
    const queryClient = createQueryClientMock();
    const { renderHookResult } = renderHookWithProviders(
      { ...newV9App, getAppMetadata },
      queryClient,
      [FeatureFlag.AppBuilder],
    )(() => useGenerateDataModelsBeforeShare('org', 'app'));

    // Waits for both queries, so the result is not undefined only because they are loading.
    await waitFor(() => {
      expect(queryClient.getQueryState([QueryKey.AppMetadata, 'org', 'app'])?.status).toBe(
        'success',
      );
      expect(queryClient.getQueryState([QueryKey.AppVersion, 'org', 'app'])?.status).toBe(
        'success',
      );
    });
    expect(renderHookResult.result.current).toBeUndefined();
  });
});

async function getGenerateBeforeShare(
  services: Partial<ServicesContextProps>,
): Promise<() => Promise<void>> {
  const { renderHookResult } = renderHookWithProviders({ ...newV9App, ...services }, undefined, [
    FeatureFlag.AppBuilder,
  ])(() => useGenerateDataModelsBeforeShare('org', 'app'));
  await waitFor(() => expect(renderHookResult.result.current).toBeDefined());
  return renderHookResult.result.current;
}
