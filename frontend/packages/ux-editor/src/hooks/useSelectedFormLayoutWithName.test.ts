import { useSelectedFormLayoutWithName } from './';
import { renderHookWithProviders } from '../testing/mocks';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { externalLayoutsMock, layoutMock, layout1NameMock } from '../testing/layoutMock';
import { waitFor } from '@testing-library/react';
import type { IFormLayouts, IInternalLayout, IInternalLayoutWithName } from '../types/global';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';

const render = async (callback: () => IFormLayouts | IInternalLayout | IInternalLayoutWithName) => {
  const getFormLayouts = jest.fn().mockImplementation(() => Promise.resolve(externalLayoutsMock));
  const formLayoutsResult = renderHookWithProviders(
    () => useFormLayoutsQuery(org, app, selectedLayoutSet),
    { queries: { getFormLayouts } },
  ).result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));

  return renderHookWithProviders(() => callback()).result;
};

describe('useFormLayoutsSelector', () => {
  it('should return the selected layout and the selected layout name', async () => {
    const result = await render(useSelectedFormLayoutWithName);
    expect(result.current).toEqual({
      layout: layoutMock,
      layoutName: layout1NameMock,
    });
  });
});
