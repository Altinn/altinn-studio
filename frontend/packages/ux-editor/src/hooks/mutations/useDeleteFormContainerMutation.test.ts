import {
  container1IdMock,
  layout1NameMock,
  queriesMock,
  renderHookWithMockStore
} from '../../testing/mocks';
import { waitFor } from '@testing-library/react';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { useDeleteFormContainerMutation } from './useDeleteFormContainerMutation';

// Test data:
const org = 'org';
const app = 'app';
const id = container1IdMock;

describe('useDeleteFormContainerMutation', () => {
  it('Should save layout without deleted container', async () => {
    const { result } = await renderDeleteFormContainerMutation();
    await result.current.mutateAsync(id);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      expect.objectContaining({
        data: {
          layout: expect.not.arrayContaining([
            expect.objectContaining({ id })
          ])
        }
      })
    );
  });
});


const renderDeleteFormContainerMutation = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  return  renderHookWithMockStore()(() => useDeleteFormContainerMutation(org, app)).renderHookResult;
}
