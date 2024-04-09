import { useFormLayout } from './';
import { renderHookWithProviders } from '../testing/mocks';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { externalLayoutsMock, layoutMock } from '../testing/layoutMock';
import { waitFor } from '@testing-library/react';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutName = 'Side1';
const selectedLayoutSet = 'test-layout-set';

const render = async () => {
  const getFormLayouts = jest.fn().mockImplementation(() => Promise.resolve(externalLayoutsMock));
  const formLayoutsResult = renderHookWithProviders(
    () => useFormLayoutsQuery(org, app, selectedLayoutSet),
    { queries: { getFormLayouts } },
  ).result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));

  return renderHookWithProviders(() => useFormLayout(selectedLayoutName));
};

describe('useFormLayout', () => {
  it('should return the layout specified by the layoutName parameter', async () => {
    const { result } = await render();
    expect(result.current).toEqual(layoutMock);
  });
});
