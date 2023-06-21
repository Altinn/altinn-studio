import { queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { useUpdateFormComponentOrderMutation } from './useUpdateFormComponentOrderMutation';
import { IFormLayoutOrder } from '../../types/global';
import {
  component1IdMock,
  component2IdMock,
  container1IdMock,
  layout1NameMock,
  layoutMock
} from '../../testing/layoutMock';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';

describe('useUpdateFormComponentOrderMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls updateFormComponentOrder with correct arguments and payload', async () => {
    await renderAndWaitForData();

    const componentOrderResult = renderHookWithMockStore()(() => useUpdateFormComponentOrderMutation(org, app, selectedLayoutSet))
      .renderHookResult
      .result;

    const newOrder: IFormLayoutOrder = {
      ...layoutMock.order,
      [container1IdMock]: [component2IdMock, component1IdMock]
    };
    await componentOrderResult.current.mutateAsync(newOrder);

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      selectedLayoutSet,
      expect.objectContaining({
        data: expect.objectContaining({
          layout: [
            expect.objectContaining({ id: container1IdMock }),
            expect.objectContaining({ id: component2IdMock }),
            expect.objectContaining({ id: component1IdMock }),
          ]
        })
      })
    );
  });
});

const renderAndWaitForData = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
}
