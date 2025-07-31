import {
  useFormLayouts,
  useFormLayout,
  useSelectedFormLayout,
  useSelectedFormLayoutWithName,
} from './useFormLayoutsSelector';
import { renderHookWithMockStore } from '../testing/mocks';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { externalLayoutsMock, layoutMock, layout1NameMock } from '../testing/layoutMock';
import { layoutSet1NameMock } from '../testing/layoutSetsMock';
import { waitFor } from '@testing-library/react';
import { convertExternalLayoutsToInternalFormat } from '../utils/formLayoutsUtils';
import type { IFormLayouts, IInternalLayout, IInternalLayoutWithName } from '../types/global';
import { app, org } from '@studio/testing/testids';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ org, app }),
}));

// Test data:
const selectedLayoutName = layout1NameMock;
const selectedLayoutSet = layoutSet1NameMock;

const render = async (callback: () => IFormLayouts | IInternalLayout | IInternalLayoutWithName) => {
  const getFormLayoutsV3 = jest.fn().mockImplementation(() => Promise.resolve(externalLayoutsMock));
  const formLayoutsResult = renderHookWithMockStore(
    {},
    { getFormLayoutsV3 },
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
