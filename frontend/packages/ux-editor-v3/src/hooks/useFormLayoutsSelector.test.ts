import {
  useFormLayouts,
  useFormLayout,
  useSelectedFormLayout,
  useSelectedFormLayoutWithName,
} from './useFormLayoutsSelector';
import { renderHookWithMockStore } from '../testing/mocks';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { externalLayoutsMock, layoutMock, layout1NameMock } from '../testing/layoutMock';
import { waitFor } from '@testing-library/react';
import { convertExternalLayoutsToInternalFormat } from '../utils/formLayoutsUtils';
import type { IFormLayouts, IInternalLayout, IInternalLayoutWithName } from '../types/global';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutName = 'Side1';
const selectedLayoutSet = 'test-layout-set';

const render = async (callback: () => IFormLayouts | IInternalLayout | IInternalLayoutWithName) => {
  const getFormLayouts = jest.fn().mockImplementation(() => Promise.resolve(externalLayoutsMock));
  const formLayoutsResult = renderHookWithMockStore(
    {},
    { getFormLayouts },
  )(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));

  return renderHookWithMockStore()(() => callback()).renderHookResult;
};

describe('useFormLayoutsSelector', () => {
  it('should return all layouts', async () => {
    const { result } = await render(useFormLayouts);
    const { convertedLayouts } = convertExternalLayoutsToInternalFormat(externalLayoutsMock);

    expect(result.current).toEqual(convertedLayouts);
  });

  it('should return the layout specified by the layoutName parameter', async () => {
    const { result } = await render(() => useFormLayout(selectedLayoutName));
    expect(result.current).toEqual(layoutMock);
  });

  it('should return the selected layout', async () => {
    const { result } = await render(useSelectedFormLayout);
    expect(result.current).toEqual(layoutMock);
  });

  it('should return the selected layout and the selected layout name', async () => {
    const { result } = await render(useSelectedFormLayoutWithName);
    expect(result.current).toEqual({
      layout: layoutMock,
      layoutName: layout1NameMock,
    });
  });
});
