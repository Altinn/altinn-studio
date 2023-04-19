import {
  container1IdMock,
  layout1Mock,
  layout1NameMock,
  queriesMock,
  renderHookWithMockStore
} from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { UpdateContainerIdMutationArgs, useUpdateContainerIdMutation } from './useUpdateContainerIdMutation';

// Test data:
const org = 'org';
const app = 'app';

describe('useUpdateContainerIdMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Saves container with new ID', async () => {
    await renderAndWaitForData();

    const updateContainerIdResult = renderHookWithMockStore()(() => useUpdateContainerIdMutation(org, app))
      .renderHookResult
      .result;

    const newId = 'newId';
    const mutationArgs: UpdateContainerIdMutationArgs = {
      currentId: container1IdMock,
      newId,
    }
    await updateContainerIdResult.current.mutateAsync(mutationArgs);

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      expect.objectContaining({
        data: {
          layout: expect.arrayContaining([
            {
              ...layout1Mock.data.layout[0],
              id: newId,
            }
          ])
        }
      })
    );
  });
});

const renderAndWaitForData = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
}
