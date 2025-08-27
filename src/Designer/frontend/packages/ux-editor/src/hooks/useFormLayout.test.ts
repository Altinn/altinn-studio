import { useFormLayout } from './index';
import { renderHookWithProviders } from '../testing/mocks';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { externalLayoutsMock, layout1NameMock, layoutMock } from '../testing/layoutMock';
import { layoutSet1NameMock } from '../testing/layoutSetsMock';
import { waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';

// Test data:
const selectedLayoutName = layout1NameMock;
const selectedLayoutSet = layoutSet1NameMock;

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
