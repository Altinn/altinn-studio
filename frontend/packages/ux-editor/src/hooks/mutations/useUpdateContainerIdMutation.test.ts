import { queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { UpdateContainerIdMutationArgs, useUpdateContainerIdMutation } from './useUpdateContainerIdMutation';
import { useRuleConfigQuery } from '../queries/useRuleConfigQuery';
import { container1IdMock, layout1Mock, layout1NameMock } from '../../testing/layoutMock';

// Test data:
const org = 'org';
const app = 'app';
const newId = 'newId';
const selectedLayoutSet = 'test-layout-set';
const mutationArgs: UpdateContainerIdMutationArgs = {
  currentId: container1IdMock,
  newId,
};


describe('useUpdateContainerIdMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Saves container with new ID and updates rule config', async () => {
    const { result } = await render();
    await result.current.mutateAsync(mutationArgs);
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
              id: newId,
            }
          ])
        })
      })
    );
    expect(queriesMock.saveRuleConfig).toHaveBeenCalledTimes(1);
  });
});

const render = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  const ruleConfigResult = renderHookWithMockStore()(() => useRuleConfigQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(ruleConfigResult.current.isSuccess).toBe(true));
  return renderHookWithMockStore()(() => useUpdateContainerIdMutation(org, app, selectedLayoutSet)).renderHookResult;
}
