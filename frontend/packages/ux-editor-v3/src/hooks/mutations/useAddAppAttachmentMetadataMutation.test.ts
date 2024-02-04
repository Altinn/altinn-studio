import { useAddAppAttachmentMetadataMutation } from './useAddAppAttachmentMetadataMutation';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';

// Test data:
const org = 'org';
const app = 'app';
const metadata: ApplicationAttachmentMetadata = {
  id: 'test',
  taskId: 'Task_1',
  maxCount: 3,
  minCount: 1,
  maxSize: 16,
  fileType: 'jpg',
};

describe('useAddAppAttachmentMetadataMutation', () => {
  it('Calls addAppAttachmentMetadata with correct arguments and payload', async () => {
    const metadataResult = renderHookWithMockStore()(() =>
      useAddAppAttachmentMetadataMutation(org, app),
    ).renderHookResult.result;

    await metadataResult.current.mutateAsync(metadata);

    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledTimes(1);
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledWith(org, app, metadata);
  });
});
