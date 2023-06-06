import { appStateMock, formDesignerMock, queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { AddFormItemMutationArgs, useAddItemToLayoutMutation } from './useAddItemToLayoutMutation';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useLayoutSetsQuery } from "../queries/useLayoutSetsQuery";
import { ApplicationAttachmentMetadata } from "app-shared/types/ApplicationAttachmentMetadata";
import { IAppState } from "../../types/global";

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

const appStateMockCopy = (layoutSetName: string): Partial<IAppState> => {
  return {
    ...appStateMock,
    formDesigner: {
      layout: {
        ...formDesignerMock.layout,
        selectedLayoutSet: layoutSetName,
      }
    }
  };
}

const applicationAttachmentMetaDataMock: ApplicationAttachmentMetadata = {
    id: 'some-id',
    taskId: 'some-task-id',
    maxCount: 1,
    minCount: 1,
    maxSize: 25,
    fileType: 'PNG',
}

describe('useAddItemToLayoutMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Returns ID of new item', async () => {
    const { result } = await renderAddItemToLayoutMutation(selectedLayoutSet);
    result.current.mutate(defaultArgs);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(id);
  });

  it('Does not add attachment metadata when component type is not fileUpload', async () => {
    const { result } = await renderAddItemToLayoutMutation(selectedLayoutSet);
    result.current.mutate(defaultArgs);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).not.toHaveBeenCalled();
  });

  it('Adds attachment metadata when component type is fileUpload', async () => {
    const { result } = await renderAddItemToLayoutMutation(selectedLayoutSet);
    result.current.mutate({ ...defaultArgs, componentType: ComponentType.FileUpload });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledTimes(1);
  });

  it('Adds attachment metadata when component type is fileUploadWithTag', async () => {
    const { result } = await renderAddItemToLayoutMutation(selectedLayoutSet);
    result.current.mutate({ ...defaultArgs, componentType: ComponentType.FileUploadWithTag });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledTimes(1);
  });

  it('Adds correct taskId to attachment metadata when component type is fileUpload and selectedLayoutSet is test-layout-set-2', async () => {
    const { result } = await renderAddItemToLayoutMutation('test-layout-set-2');
    result.current.mutate({ ...defaultArgs, componentType: ComponentType.FileUploadWithTag });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledWith({ ...applicationAttachmentMetaDataMock, taskId: 'task_2' });
  });

  it('Adds Task_1 to attachment metadata when component type is fileUpload and selectedLayoutSet is undefined', async () => {
    const { result } = await renderAddItemToLayoutMutation(undefined);
    result.current.mutate({ ...defaultArgs, componentType: ComponentType.FileUploadWithTag });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledWith({ ...applicationAttachmentMetaDataMock, taskId: 'task_1' });
  });
});

const renderAddItemToLayoutMutation = async (layoutSetName: string) => {
  const { result: formLayoutsResult } = renderHookWithMockStore(appStateMockCopy(layoutSetName))(() => useFormLayoutsQuery(org, app, layoutSetName)).renderHookResult;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  const { result: layoutSetsResult } = renderHookWithMockStore(appStateMockCopy(layoutSetName))(() => useLayoutSetsQuery(org, app)).renderHookResult;
  await waitFor(() => expect(layoutSetsResult.current.isSuccess).toBe(true));
  return renderHookWithMockStore()(() => useAddItemToLayoutMutation(org, app, layoutSetName)).renderHookResult;
}
