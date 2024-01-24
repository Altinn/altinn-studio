import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import type { AddFormContainerMutationArgs } from './useAddFormContainerMutation';
import { useAddFormContainerMutation } from './useAddFormContainerMutation';
import type { FormContainer } from '../../types/FormContainer';
import { ComponentType } from 'app-shared/types/ComponentType';
import { layout1NameMock } from '../../testing/layoutMock';

// Test data:
const org = 'org';
const app = 'app';
const id = 'testid';
const selectedLayoutSet = 'test-layout-set';
const container: FormContainer = {
  id,
  itemType: 'CONTAINER',
};
const defaultArgs: AddFormContainerMutationArgs = {
  container,
};

// Mocks:
jest.mock('../../utils/generateId', () => ({
  generateComponentId: () => id,
}));

describe('useAddFormContainerMutation', () => {
  it('Calls saveFormLayout with correct arguments and payload', async () => {
    const { result } = await renderAddFormContainerMutation();
    await result.current.mutateAsync(defaultArgs);
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
              id,
              type: ComponentType.Group,
              children: [],
            },
          ]),
        }),
      }),
    );
  });
});

const renderAddFormContainerMutation = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() =>
    useFormLayoutsQuery(org, app, selectedLayoutSet),
  ).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  return renderHookWithMockStore()(() => useAddFormContainerMutation(org, app, selectedLayoutSet))
    .renderHookResult;
};
