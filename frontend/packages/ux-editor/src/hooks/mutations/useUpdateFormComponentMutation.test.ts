import { queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { ComponentType } from '../../components';
import { UpdateFormComponentArgs, useUpdateFormComponentMutation } from './useUpdateFormComponentMutation';
import { component1IdMock, layout1NameMock } from '../../testing/layoutMock';
import type { FormComponent, FormFileUploaderComponent } from '../../types/FormComponent';
import { IDataModelBindings } from '../../types/global';

// Test data:
const org = 'org';
const app = 'app';
const id = component1IdMock;
const type = ComponentType.TextArea;
const dataModelBindings: IDataModelBindings = {};
const updatedComponent: FormComponent = {
  id,
  itemType: 'COMPONENT',
  type: ComponentType.TextArea,
  dataModelBindings,
}
const defaultArgs: UpdateFormComponentArgs = { id, updatedComponent };

describe('useUpdateFormComponentMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Saves layout with updated component', async () => {
    await renderAndWaitForData();

    const updateFormComponentResult = renderHookWithMockStore()(() => useUpdateFormComponentMutation(org, app))
      .renderHookResult
      .result;

    await updateFormComponentResult.current.mutateAsync(defaultArgs);

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      expect.objectContaining({
        data: expect.objectContaining({
          layout: expect.arrayContaining([
            {
              id,
              type,
              dataModelBindings,
            }
          ])
        })
      })
    );
  });

  it('Does not run attachment metadata queries if the component type is not fileupload', async () => {
    await renderAndWaitForData();
    const updateFormComponentResult = renderHookWithMockStore()(() => useUpdateFormComponentMutation(org, app))
      .renderHookResult
      .result;
    await updateFormComponentResult.current.mutateAsync(defaultArgs);
    expect(queriesMock.addAppAttachmentMetadata).not.toHaveBeenCalled();
    expect(queriesMock.deleteAppAttachmentMetadata).not.toHaveBeenCalled();
    expect(queriesMock.updateAppAttachmentMetadata).not.toHaveBeenCalled();
  });

  it('Updates attachment metadata queries if the component type is fileupload', async () => {
    await renderAndWaitForData();
    const updateFormComponentResult = renderHookWithMockStore()(() => useUpdateFormComponentMutation(org, app))
      .renderHookResult
      .result;
    const newComponent: FormFileUploaderComponent = {
      ...updatedComponent,
      description: 'test',
      displayMode: 'test',
      hasCustomFileEndings: false,
      maxFileSizeInMB: 100,
      maxNumberOfAttachments: 2,
      minNumberOfAttachments: 1,
      type: ComponentType.FileUpload,
    };
    const args: UpdateFormComponentArgs = {
      ...defaultArgs,
      updatedComponent: newComponent,
    }
    await updateFormComponentResult.current.mutateAsync(args);
    expect(queriesMock.updateAppAttachmentMetadata).toHaveBeenCalledTimes(1);
  });
});

const renderAndWaitForData = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
}
