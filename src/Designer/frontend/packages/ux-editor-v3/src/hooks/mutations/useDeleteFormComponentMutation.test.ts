import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import { waitFor } from '@testing-library/react';
import { useDeleteFormComponentMutation } from './useDeleteFormComponentMutation';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { component2IdMock, layout1NameMock } from '@altinn/ux-editor-v3/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;

describe('useDeleteFormComponentMutation', () => {
  it('Should save layout without deleted component', async () => {
    const { result } = await renderDeleteFormComponentsMutation();
    await result.current.mutateAsync(component2IdMock);
    expect(queriesMock.saveFormLayoutV3).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayoutV3).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      selectedLayoutSet,
      expect.objectContaining({
        layout: expect.objectContaining({
          data: expect.objectContaining({
            layout: expect.not.arrayContaining([expect.objectContaining({ id: component2IdMock })]),
          }),
        }),
      }),
    );
  });
});

const renderDeleteFormComponentsMutation = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() =>
    useFormLayoutsQuery(org, app, selectedLayoutSet),
  ).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  return renderHookWithMockStore()(() =>
    useDeleteFormComponentMutation(org, app, selectedLayoutSet),
  ).renderHookResult;
};
