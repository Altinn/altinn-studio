import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../testing/mocks';
import { useDeleteAppAttachmentMetadataMutation } from './useDeleteAppAttachmentMetadataMutation';

// Test data:
const org = 'org';
const app = 'app';
const id = 'test';

describe('useDeleteAppAttachmentMetadataMutation', () => {
  it('Calls deleteAppAttachmentMetadata with correct arguments and payload', async () => {
    const metadataResult = renderHookWithProviders(() =>
      useDeleteAppAttachmentMetadataMutation(org, app),
    ).result;
    await metadataResult.current.mutateAsync(id);
    expect(queriesMock.deleteAppAttachmentMetadata).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteAppAttachmentMetadata).toHaveBeenCalledWith(org, app, id);
  });
});
