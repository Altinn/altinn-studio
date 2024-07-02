import { useFormLayouts } from './';
import { renderHookWithProviders } from '../testing/mocks';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { externalLayoutsMock } from '../testing/layoutMock';
import { layoutSet1NameMock } from '../testing/layoutSetsMock';
import { waitFor } from '@testing-library/react';
import { convertExternalLayoutsToInternalFormat } from '../utils/formLayoutsUtils';
import { app, org } from '@studio/testing/testids';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;

const render = async () => {
  const getFormLayouts = jest.fn().mockImplementation(() => Promise.resolve(externalLayoutsMock));
  const formLayoutsResult = renderHookWithProviders(
    () => useFormLayoutsQuery(org, app, selectedLayoutSet),
    { queries: { getFormLayouts } },
  ).result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));

  return renderHookWithProviders(useFormLayouts);
};

describe('useFormLayouts', () => {
  it('should return all layouts', async () => {
    const { result } = await render();
    const convertedLayouts = convertExternalLayoutsToInternalFormat(externalLayoutsMock);

    expect(result.current).toEqual(convertedLayouts);
  });
});
