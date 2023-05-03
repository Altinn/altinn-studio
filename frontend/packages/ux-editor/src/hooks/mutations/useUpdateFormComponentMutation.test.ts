// Test data:
import {
  component1IdMock,
  layout1NameMock,
  queriesMock,
  renderHookWithMockStore
} from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { IFormComponent } from '../../types/global';
import { ComponentType } from '../../components';
import { UpdateFormComponentArgs, useUpdateFormComponentMutation } from './useUpdateFormComponentMutation';

// Test data:
const org = 'org';
const app = 'app';
const id = component1IdMock;
const type = ComponentType.TextArea;
const updatedComponent: IFormComponent = {
  id,
  itemType: 'COMPONENT',
  type: ComponentType.TextArea,
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
    const newComponent: IFormComponent = {
      ...updatedComponent,
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
