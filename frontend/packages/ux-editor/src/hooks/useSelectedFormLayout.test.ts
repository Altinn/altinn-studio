import { useSelectedFormLayout } from './';
import { renderHookWithProviders } from '../testing/mocks';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { externalLayoutsMock, layoutMock } from '../testing/layoutMock';
import { waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;

const render = async () => {
  const getFormLayouts = jest.fn().mockImplementation(() => Promise.resolve(externalLayoutsMock));
  const formLayoutsResult = renderHookWithProviders(
    () => useFormLayoutsQuery(org, app, selectedLayoutSet),
    { queries: { getFormLayouts } },
  ).result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));

  return renderHookWithProviders(useSelectedFormLayout);
};

describe('useSelectedFormLayout', () => {
  it('should return the selected layout', async () => {
    const { result } = await render();
    expect(result.current).toEqual(layoutMock);
  });
});
