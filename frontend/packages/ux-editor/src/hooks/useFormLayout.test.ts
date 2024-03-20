import { useFormLayout } from './';
import { renderHookWithMockStore } from '../testing/mocks';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { externalLayoutsMock, layoutMock } from '../testing/layoutMock';
import { waitFor } from '@testing-library/react';
import type { IFormLayouts, IInternalLayout, IInternalLayoutWithName } from '../types/global';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutName = 'Side1';
const selectedLayoutSet = 'test-layout-set';

const render = async (callback: () => IFormLayouts | IInternalLayout | IInternalLayoutWithName) => {
  const getFormLayouts = jest.fn().mockImplementation(() => Promise.resolve(externalLayoutsMock));
  const formLayoutsResult = renderHookWithMockStore({ getFormLayouts })(() =>
    useFormLayoutsQuery(org, app, selectedLayoutSet),
  ).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));

  return renderHookWithMockStore()(() => callback()).renderHookResult;
};

describe('useFormLayout', () => {
  it('should return the layout specified by the layoutName parameter', async () => {
    const { result } = await render(() => useFormLayout(selectedLayoutName));
    expect(result.current).toEqual(layoutMock);
  });
});
