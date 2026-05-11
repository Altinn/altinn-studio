import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderHookWithProviders } from '../../testing/mocks';
import { waitFor } from '@testing-library/react';
import type { AddFormItemMutationArgs } from './useAddItemToLayoutMutation';
import { useAddItemToLayoutMutation } from './useAddItemToLayoutMutation';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import { externalLayoutsMock } from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock, layoutSetsMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { convertExternalLayoutsToInternalFormat } from '../../utils/formLayoutsUtils';
import { app, org } from '@studio/testing/testids';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;
const id = 'component-id';

const defaultArgs: AddFormItemMutationArgs = {
  componentType: ComponentType.Paragraph,
  newId: id,
  parentId: 'Container-1',
  index: 0,
};

const applicationAttachmentMetadataMock: ApplicationAttachmentMetadata = {
  id,
  taskId: 'some-task-id',
  maxCount: 1,
  minCount: 1,
  maxSize: 25,
  fileType: undefined,
};

describe('useAddItemToLayoutMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Returns ID of new item', async () => {
    const { result } = renderAddItemToLayoutMutation(selectedLayoutSet);
    result.current.mutate(defaultArgs);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(id);
  });

  it('Does not add attachment metadata when component type is not fileUpload', async () => {
    const { result } = renderAddItemToLayoutMutation(selectedLayoutSet);
    result.current.mutate(defaultArgs);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).not.toHaveBeenCalled();
  });

  it('Adds attachment metadata when component type is fileUpload', async () => {
    const { result } = renderAddItemToLayoutMutation(selectedLayoutSet);
    result.current.mutate({ ...defaultArgs, componentType: ComponentType.FileUpload });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledTimes(1);
  });

  it('Adds attachment metadata when component type is fileUploadWithTag', async () => {
    const { result } = renderAddItemToLayoutMutation(selectedLayoutSet);
    result.current.mutate({ ...defaultArgs, componentType: ComponentType.FileUploadWithTag });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledTimes(1);
  });

  it('Adds attachment metadata when component type is imageUpload', async () => {
    const { result } = renderAddItemToLayoutMutation(selectedLayoutSet);
    result.current.mutate({ ...defaultArgs, componentType: ComponentType.ImageUpload });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledTimes(1);
  });

  it('Adds correct taskId to attachment metadata when component type is fileUpload and selectedLayoutSet is test-layout-set-1', async () => {
    const { result } = renderAddItemToLayoutMutation(layoutSet1NameMock);
    result.current.mutate({ ...defaultArgs, componentType: ComponentType.FileUpload });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledWith(org, app, {
      ...applicationAttachmentMetadataMock,
      taskId: 'Task_1',
    });
  });
});

const renderAddItemToLayoutMutation = (layoutSetName?: string) => {
  const queryClient = createQueryClientMock();

  queryClient.setQueryData(
    [QueryKey.FormLayouts, org, app, layoutSetName],
    convertExternalLayoutsToInternalFormat(externalLayoutsMock),
  );
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSetName ? layoutSetsMock : null);
  return renderHookWithProviders(() => useAddItemToLayoutMutation(org, app, layoutSetName), {
    queryClient,
  });
};
