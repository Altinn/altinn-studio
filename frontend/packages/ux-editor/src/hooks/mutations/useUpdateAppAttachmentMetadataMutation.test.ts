import { queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { useUpdateAppAttachmentMetadataMutation } from './useUpdateAppAttachmentMetadataMutation';
import { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';

// Test data:
const org = 'org';
const app = 'app';

describe('useUpdateAppAttachmentMetadataMutation', () => {
  it('Calls updateAppAttachmentMetadata with correct arguments and payload', async () => {
    const metadataResult = renderHookWithMockStore()(() => useUpdateAppAttachmentMetadataMutation(org, app))
      .renderHookResult
      .result;

    const metadata: ApplicationAttachmentMetadata = {
      id: 'test',
      maxCount: 3,
      minCount: 1,
      maxSize: 16,
      fileType: 'jpg'
    };
    await metadataResult.current.mutateAsync(metadata);

    expect(queriesMock.updateAppAttachmentMetadata).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateAppAttachmentMetadata).toHaveBeenCalledWith(
      org,
      app,
      metadata
    );
  });
});
