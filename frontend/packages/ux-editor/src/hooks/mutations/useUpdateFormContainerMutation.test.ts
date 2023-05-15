import { waitFor } from '@testing-library/react';
import { queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { UpdateFormContainerMutationArgs, useUpdateFormContainerMutation } from './useUpdateFormContainerMutation';
import { FormContainer } from '../../types/FormContainer';
import { container1IdMock, layout1Mock, layout1NameMock } from '../../testing/layoutMock';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';
const maxCount = 2;
const updatedContainer: FormContainer = {
  itemType: 'CONTAINER',
  maxCount,
};
const id = container1IdMock;
const mutationArgs: UpdateFormContainerMutationArgs = { id, updatedContainer };

describe('useUpdateFormContainerMutation', () => {
  it('Saves layouts with new container', async () => {
    await renderAndWaitForData();

    const updateFormContainerResult = renderHookWithMockStore()(() => useUpdateFormContainerMutation(org, app, selectedLayoutSet))
      .renderHookResult
      .result;

    await updateFormContainerResult.current.mutateAsync(mutationArgs);

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
              ...layout1Mock.data.layout[0],
              id,
              maxCount,
            }
          ])
        })
      })
    );
  });
});

const renderAndWaitForData = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
}
