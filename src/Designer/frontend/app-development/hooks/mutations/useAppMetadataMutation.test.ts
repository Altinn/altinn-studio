import { renderHookWithProviders } from '../../test/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { useAppMetadataMutation } from './useAppMetadataMutation';
import { app, org } from '@studio/testing/testids';

const metadata: ApplicationMetadata = { id: `${org}/${app}`, org };
const versionedMetadata: ApplicationMetadata = { ...metadata, revision: '"loaded-revision"' };

describe('useAppMetadataMutation', () => {
  afterEach(jest.clearAllMocks);

  it('caches the saved metadata and revision', async () => {
    const saved: ApplicationMetadata = { ...versionedMetadata, revision: '"saved-revision"' };
    const queryClient = createQueryClientMock();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const updateAppMetadata = jest.fn().mockResolvedValue(saved);
    const { result } = renderMutation({ updateAppMetadata }, queryClient);

    await result.current.mutateAsync(versionedMetadata);

    expect(updateAppMetadata).toHaveBeenCalledWith(org, app, versionedMetadata);
    expect(queryClient.getQueryData([QueryKey.AppMetadata, org, app])).toEqual(saved);
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: [QueryKey.AppMetadata, org, app],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppValidation, org, app],
    });
  });

  it('invalidates metadata after an unversioned save', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const updateAppMetadata = jest.fn().mockResolvedValue(metadata);
    const { result } = renderMutation({ updateAppMetadata }, queryClient);

    await result.current.mutateAsync(metadata);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [QueryKey.AppMetadata, org, app] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppValidation, org, app],
    });
  });

  it('invalidates metadata after a versioned save is rejected', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const updateAppMetadata = jest.fn().mockRejectedValue({ response: { status: 412 } });
    const { result } = renderMutation({ updateAppMetadata }, queryClient);

    await expect(result.current.mutateAsync(versionedMetadata)).rejects.toBeDefined();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [QueryKey.AppMetadata, org, app] });
  });

  it('does not invalidate metadata after an unversioned save fails', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const updateAppMetadata = jest.fn().mockRejectedValue({ response: { status: 500 } });
    const { result } = renderMutation({ updateAppMetadata }, queryClient);

    await expect(result.current.mutateAsync(metadata)).rejects.toBeDefined();

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

function renderMutation(
  queries: { updateAppMetadata: jest.Mock },
  queryClient: ReturnType<typeof createQueryClientMock>,
) {
  return renderHookWithProviders(queries, queryClient)(() => useAppMetadataMutation(org, app))
    .renderHookResult;
}
