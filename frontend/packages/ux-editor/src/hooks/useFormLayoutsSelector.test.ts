import { useFormLayouts, useSelectedFormLayout, useSelectedFormLayoutWithName } from './useFormLayoutsSelector';
import { renderHookWithMockStore } from '../testing/mocks';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { externalLayoutsMock, layoutMock, layout1NameMock } from '../testing/layoutMock';
import { waitFor } from '@testing-library/react';
import { convertExternalLayoutsToInternalFormat } from '../utils/formLayoutsUtils';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';

describe('useFormLayoutsSelector', () => {
  it('should return all layouts', async () => {
    const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
    await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));

    const { result } = renderHookWithMockStore()(() => useFormLayouts()).renderHookResult;
    const { convertedLayouts } = convertExternalLayoutsToInternalFormat(externalLayoutsMock);

    expect(result.current).toEqual(convertedLayouts);
  });

  it('should return the selected layout', async () => {
    const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
    await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));

    const { result } = renderHookWithMockStore()(() => useSelectedFormLayout()).renderHookResult;
    expect(result.current).toEqual(layoutMock);
  });

  it('should return the selected layout and the selected layout name', async () => {
    const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
    await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));

    const { result } = renderHookWithMockStore()(() => useSelectedFormLayoutWithName()).renderHookResult;
    expect(result.current).toEqual({
      layout: layoutMock,
      layoutName: layout1NameMock,
    });
  });
});
