import { useAddAppAttachmentMetadataMutation } from './useAddAppAttachmentMetadataMutation';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../testing/mocks';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import { app, org } from '@studio/testing/testids';

// Test data:
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
    const metadataResult = renderHookWithProviders(() =>
      useAddAppAttachmentMetadataMutation(org, app),
    ).result;

    await metadataResult.current.mutateAsync(metadata);

    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledTimes(1);
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledWith(org, app, metadata);
  });
});
