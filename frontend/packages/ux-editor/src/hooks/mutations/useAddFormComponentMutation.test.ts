import { queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { AddFormComponentMutationArgs, useAddFormComponentMutation } from './useAddFormComponentMutation';
import { ComponentType } from 'app-shared/types/ComponentType';
import { layout1NameMock } from '../../testing/layoutMock';
import type { FormComponent } from '../../types/FormComponent';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';
const component: FormComponent = {
  id: 'test',
  itemType: 'COMPONENT',
  type: ComponentType.Paragraph,
  dataModelBindings: {},
};
const defaultArgs: AddFormComponentMutationArgs = {
  component,
  position: 0,
};

describe('useAddFormComponentMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls saveFormLayout with correct arguments and payload', async () => {
    const { result } = await renderAddFormComponentMutation();
    result.current.mutate(defaultArgs);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      selectedLayoutSet,
      expect.objectContaining({
        data: expect.objectContaining({
          layout: expect.arrayContaining([
            {
              id: component.id,
              type: component.type,
              dataModelBindings: component.dataModelBindings,
            }
          ])
        })
      })
    );
  });

  it('Returns ID of new component', async () => {
    const { result } = await renderAddFormComponentMutation();
    result.current.mutate(defaultArgs);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(component.id);
  });

  it('Does not add attachment metadata when component type is not fileupload', async () => {
    const { result } = await renderAddFormComponentMutation();
    result.current.mutate(defaultArgs);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).not.toHaveBeenCalled();
  });

  it('Adds attachment metadata when component type is fileupload', async () => {
    const { result } = await renderAddFormComponentMutation();
    const newComponent = { ...component, type: ComponentType.FileUpload };
    result.current.mutate({ ...defaultArgs, component: newComponent });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.addAppAttachmentMetadata).toHaveBeenCalledTimes(1);
  });
});

const renderAddFormComponentMutation = async () => {
  const { result } = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult;
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return renderHookWithMockStore()(() => useAddFormComponentMutation(org, app, selectedLayoutSet)).renderHookResult;
}
