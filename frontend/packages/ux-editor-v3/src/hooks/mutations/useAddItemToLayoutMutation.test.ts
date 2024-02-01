import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import { appStateMock, formDesignerMock } from '../../testing/stateMocks';
import { waitFor } from '@testing-library/react';
import type { AddFormItemMutationArgs } from './useAddItemToLayoutMutation';
import { useAddItemToLayoutMutation } from './useAddItemToLayoutMutation';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import type { IAppState } from '../../types/global';
import { externalLayoutsMock, layoutSetsMock } from '../../testing/layoutMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { convertExternalLayoutsToInternalFormat } from '../../utils/formLayoutsUtils';

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

const appStateMockCopy = (layoutSetName: string): Partial<IAppState> => ({
  ...appStateMock,
  formDesigner: {
    layout: {
      ...formDesignerMock.layout,
      selectedLayoutSet: layoutSetName,
    },
  },
});

const applicationAttachmentMetaDataMock: ApplicationAttachmentMetadata = {
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

  it('Adds correct taskId to attachment metadata when component type is fileUpload and selectedLayoutSet is test-layout-set-2', async () => {
    const { result } = renderAddItemToLayoutMutation('test-layout-set-2');
    result.current.mutate({ ...defaultArgs, componentType: ComponentType.FileUpload });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledWith(org, app, {
      ...applicationAttachmentMetaDataMock,
      taskId: 'Task_2',
    });
  });

  it('Adds Task_1 to attachment metadata when component type is fileUpload and selectedLayoutSet is undefined', async () => {
    const { result } = renderAddItemToLayoutMutation(undefined);
    result.current.mutate({ ...defaultArgs, componentType: ComponentType.FileUpload });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledWith(org, app, {
      ...applicationAttachmentMetaDataMock,
      taskId: 'Task_1',
    });
  });
});

const renderAddItemToLayoutMutation = (layoutSetName?: string) => {
  queryClientMock.setQueryData(
    [QueryKey.FormLayouts, org, app, layoutSetName],
    convertExternalLayoutsToInternalFormat(externalLayoutsMock).convertedLayouts,
  );
  queryClientMock.setQueryData(
    [QueryKey.LayoutSets, org, app],
    layoutSetName ? layoutSetsMock : null,
  );
  return renderHookWithMockStore(appStateMockCopy(layoutSetName))(() =>
    useAddItemToLayoutMutation(org, app, layoutSetName),
  ).renderHookResult;
};
