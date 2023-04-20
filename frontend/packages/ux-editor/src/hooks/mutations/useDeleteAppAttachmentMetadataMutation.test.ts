import { queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { useDeleteAppAttachmentMetadataMutation } from './useDeleteAppAttachmentMetadataMutation';

// Test data:
const org = 'org';
const app = 'app';
const id = 'test';

describe('useDeleteAppAttachmentMetadataMutation', () => {
  it('Calls deleteAppAttachmentMetadata with correct arguments and payload', async () => {
    const metadataResult = renderHookWithMockStore()(() => useDeleteAppAttachmentMetadataMutation(org, app))
      .renderHookResult
      .result;
    await metadataResult.current.mutateAsync(id);
    expect(queriesMock.deleteAppAttachmentMetadata).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteAppAttachmentMetadata).toHaveBeenCalledWith(org, app, id);
  });
});
