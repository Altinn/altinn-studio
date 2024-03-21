import { useFormLayouts } from './';
import { renderHookWithProviders } from '../testing/mocks';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { externalLayoutsMock } from '../testing/layoutMock';
import { waitFor } from '@testing-library/react';
import { convertExternalLayoutsToInternalFormat } from '../utils/formLayoutsUtils';
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

  return renderHookWithProviders(() => callback());
};

describe('useFormLayouts', () => {
  it('should return all layouts', async () => {
    const { result } = await render(useFormLayouts);
    const convertedLayouts = convertExternalLayoutsToInternalFormat(externalLayoutsMock);

    expect(result.current).toEqual(convertedLayouts);
  });
});
