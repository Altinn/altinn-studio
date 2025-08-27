import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import { useDeleteAppAttachmentMetadataMutation } from './useDeleteAppAttachmentMetadataMutation';
import { app, org } from '@studio/testing/testids';

// Test data:
const id = 'test';

describe('useDeleteAppAttachmentMetadataMutation', () => {
  it('Calls deleteAppAttachmentMetadata with correct arguments and payload', async () => {
    const metadataResult = renderHookWithMockStore()(() =>
      useDeleteAppAttachmentMetadataMutation(org, app),
    ).renderHookResult.result;
    await metadataResult.current.mutateAsync(id);
    expect(queriesMock.deleteAppAttachmentMetadata).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteAppAttachmentMetadata).toHaveBeenCalledWith(org, app, id);
  });
});
