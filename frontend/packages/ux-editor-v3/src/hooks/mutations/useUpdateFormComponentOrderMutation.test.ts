import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import { useUpdateFormComponentOrderMutation } from './useUpdateFormComponentOrderMutation';
import type { IFormLayoutOrder } from '../../types/global';
import {
  component1IdMock,
  component2IdMock,
  container1IdMock,
  externalLayoutsMock,
  layout1NameMock,
  layoutMock,
} from '../../testing/layoutMock';
import type { FormLayoutsResponseV3 } from 'app-shared/types/api';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';

describe('useUpdateFormComponentOrderMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls updateFormComponentOrder with correct arguments and payload', async () => {
    await renderAndWaitForData();

    const componentOrderResult = renderHookWithMockStore()(() =>
      useUpdateFormComponentOrderMutation(org, app, selectedLayoutSet),
    ).renderHookResult.result;

    const newOrder: IFormLayoutOrder = {
      ...layoutMock.order,
      [container1IdMock]: [component2IdMock, component1IdMock],
    };
    await componentOrderResult.current.mutateAsync(newOrder);

    expect(queriesMock.saveFormLayoutV3).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayoutV3).toHaveBeenCalledWith(
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
          ],
        }),
      }),
    );
  });
});

const renderAndWaitForData = async () => {
  const getFormLayoutsV3 = jest
    .fn()
    .mockImplementation(() => Promise.resolve<FormLayoutsResponseV3>(externalLayoutsMock));
  const formLayoutsResult = renderHookWithMockStore(
    {},
    { getFormLayoutsV3 },
  )(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
};
