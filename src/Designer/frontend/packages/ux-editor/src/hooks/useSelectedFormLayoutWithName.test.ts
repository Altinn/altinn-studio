import { useSelectedFormLayoutWithName } from './index';
import { renderHookWithProviders } from '../testing/mocks';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { externalLayoutsMock, layoutMock, layout1NameMock } from '../testing/layoutMock';
import { layoutSet1NameMock } from '../testing/layoutSetsMock';
import { waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;

const render = async () => {
  const getFormLayouts = jest.fn().mockImplementation(() => Promise.resolve(externalLayoutsMock));
  const formLayoutsResult = renderHookWithProviders(
    () => useFormLayoutsQuery(org, app, selectedLayoutSet),
    {
      queries: { getFormLayouts },
    },
  ).result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));

  return renderHookWithProviders(useSelectedFormLayoutWithName);
};

describe('useSelectedFormLayoutWithName', () => {
  it('should return the selected layout and the selected layout name', async () => {
    const { result } = await render();
    expect(result.current).toEqual({
      layout: layoutMock,
      layoutName: layout1NameMock,
    });
  });
});
