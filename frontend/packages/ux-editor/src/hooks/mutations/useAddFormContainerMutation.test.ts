import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import type { AddFormContainerMutationArgs } from './useAddFormContainerMutation';
import { useAddFormContainerMutation } from './useAddFormContainerMutation';
import type { FormContainer } from '../../types/FormContainer';
import { ComponentType } from 'app-shared/types/ComponentType';
import { layout1NameMock } from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';

// Test data:
const id = 'testid';
const selectedLayoutSet = layoutSet1NameMock;
const container: FormContainer = {
  id,
  itemType: 'CONTAINER',
  type: ComponentType.Group,
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
      {
        componentIdsChange: undefined,
        layout: expect.objectContaining({
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
      },
    );
  });
});

const renderAddFormContainerMutation = async () => {
  const formLayoutsResult = renderHookWithProviders(() =>
    useFormLayoutsQuery(org, app, selectedLayoutSet),
  ).result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  return renderHookWithProviders(() => useAddFormContainerMutation(org, app, selectedLayoutSet));
};
