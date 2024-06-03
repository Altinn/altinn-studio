import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import type { AddFormContainerMutationArgs } from './useAddFormContainerMutation';
import { useAddFormContainerMutation } from './useAddFormContainerMutation';
import type { FormContainer } from '../../types/FormContainer';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { layout1NameMock } from '@altinn/ux-editor-v3/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';

// Test data:
const id = 'testid';
const selectedLayoutSet = layoutSet1NameMock;
const container: FormContainer = {
  id,
  itemType: 'CONTAINER',
  type: ComponentTypeV3.Group,
};
const defaultArgs: AddFormContainerMutationArgs = {
  container,
};

// Mocks:
jest.mock('../../utils/generateId', () => ({
  generateComponentId: () => id,
}));

describe('useAddFormContainerMutation', () => {
  it('Calls saveFormLayoutV3 with correct arguments and payload', async () => {
    const { result } = await renderAddFormContainerMutation();
    await result.current.mutateAsync(defaultArgs);
    expect(queriesMock.saveFormLayoutV3).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayoutV3).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      selectedLayoutSet,
      expect.objectContaining({
        data: expect.objectContaining({
          layout: expect.arrayContaining([
            {
              id,
              type: ComponentTypeV3.Group,
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
