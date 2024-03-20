import { useSelectedFormLayout } from './';
import { renderHookWithMockStore } from '../testing/mocks';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { externalLayoutsMock, layoutMock } from '../testing/layoutMock';
import { waitFor } from '@testing-library/react';
import type { IFormLayouts, IInternalLayout, IInternalLayoutWithName } from '../types/global';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';

const render = async (callback: () => IFormLayouts | IInternalLayout | IInternalLayoutWithName) => {
  const getFormLayouts = jest.fn().mockImplementation(() => Promise.resolve(externalLayoutsMock));
  const formLayoutsResult = renderHookWithMockStore({ getFormLayouts })(() =>
    useFormLayoutsQuery(org, app, selectedLayoutSet),
  ).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));

  return renderHookWithMockStore()(() => callback()).renderHookResult;
};

describe('useFormLayoutsSelector', () => {
  it('should return the selected layout', async () => {
    const { result } = await render(useSelectedFormLayout);
    expect(result.current).toEqual(layoutMock);
  });
});
