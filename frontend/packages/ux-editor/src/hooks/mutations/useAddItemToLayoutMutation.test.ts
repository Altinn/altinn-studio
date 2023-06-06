import { queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { AddFormItemMutationArgs, useAddItemToLayoutMutation } from './useAddItemToLayoutMutation';
import { ComponentType } from 'app-shared/types/ComponentType';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';
const id = 'component-id';

const defaultArgs: AddFormItemMutationArgs = {
  componentType: ComponentType.Paragraph,
  newId: id,
  parentId: 'Container-1',
  index: 0,
};

describe('useAddItemToLayoutMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Returns ID of new item', async () => {
    const { result } = await renderAddItemToLayoutMutation();
    result.current.mutate(defaultArgs);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(id);
  });

  it('Does not add attachment metadata when component type is not fileUpload', async () => {
    const { result } = await renderAddItemToLayoutMutation();
    result.current.mutate(defaultArgs);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).not.toHaveBeenCalled();
  });

  it('Adds attachment metadata when component type is fileUpload', async () => {
    const { result } = await renderAddItemToLayoutMutation();
    result.current.mutate({ ...defaultArgs, componentType: ComponentType.FileUpload });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledTimes(1);
  });

  it('Adds attachment metadata when component type is fileUploadWithTag', async () => {
    const { result } = await renderAddItemToLayoutMutation();
    result.current.mutate({ ...defaultArgs, componentType: ComponentType.FileUploadWithTag });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledTimes(1);
  });
});

const renderAddItemToLayoutMutation = async () => {
  const { result } = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult;
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return renderHookWithMockStore()(() => useAddItemToLayoutMutation(org, app, selectedLayoutSet)).renderHookResult;
}
