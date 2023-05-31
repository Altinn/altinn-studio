import { useAddAppAttachmentMetadataMutation } from './useAddAppAttachmentMetadataMutation';
import { queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';

// Test data:
const org = 'org';
const app = 'app';
const metadata: ApplicationAttachmentMetadata = {
  id: 'test',
  maxCount: 3,
  minCount: 1,
  maxSize: 16,
  fileType: 'jpg'
};

describe('useAddAppAttachmentMetadataMutation', () => {
  it('Calls addAppAttachmentMetadata with correct arguments and payload', async () => {
    const metadataResult = renderHookWithMockStore()(() => useAddAppAttachmentMetadataMutation(org, app))
      .renderHookResult
      .result;

    await metadataResult.current.mutateAsync(metadata);

    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledTimes(1);
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledWith(
      org,
      app,
      metadata
    );
  });
});
