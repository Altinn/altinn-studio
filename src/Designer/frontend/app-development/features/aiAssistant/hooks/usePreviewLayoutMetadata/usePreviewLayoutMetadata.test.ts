import { waitFor } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { ILayoutSettings } from 'app-shared/types/global';
import { renderHookWithProviders } from '../../../../test/mocks';
import { usePreviewLayoutMetadata } from './usePreviewLayoutMetadata';
import { app, org } from '@studio/testing/testids';

const layoutSetName = 'form-layout-set';
const taskId = 'Task_1';
const layoutName = 'first-page';

const layoutSetsWithEntry: LayoutSets = {
  sets: [{ id: layoutSetName, tasks: [taskId] }],
};

const layoutSettingsWithPages: ILayoutSettings = {
  pages: { order: [layoutName, 'second-page'] },
};

describe('usePreviewLayoutMetadata', () => {
  it('should return metadata when layout sets and settings are available', async () => {
    const { result } = renderHook({
      getLayoutSets: jest.fn().mockResolvedValue(layoutSetsWithEntry),
      getFormLayoutSettings: jest.fn().mockResolvedValue(layoutSettingsWithPages),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.metadata).toEqual({
      layoutSetName,
      layoutName,
      taskId,
    });
    expect(result.current.error).toBeUndefined();
  });

  it('should default taskId to Task_1 when layout set has no tasks', async () => {
    const layoutSetsWithoutTasks: LayoutSets = {
      sets: [{ id: layoutSetName }],
    };

    const { result } = renderHook({
      getLayoutSets: jest.fn().mockResolvedValue(layoutSetsWithoutTasks),
      getFormLayoutSettings: jest.fn().mockResolvedValue(layoutSettingsWithPages),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.metadata.taskId).toBe('Task_1');
  });

  it('should return empty metadata when there are no layout sets', async () => {
    const emptyLayoutSets: LayoutSets = { sets: [] };

    const { result } = renderHook({
      getLayoutSets: jest.fn().mockResolvedValue(emptyLayoutSets),
    });

    await waitFor(() => expect(result.current.metadata).toEqual({}));
  });

  it('should return empty metadata when layout settings has no pages', async () => {
    const emptyLayoutSettings: ILayoutSettings = {};

    const { result } = renderHook({
      getLayoutSets: jest.fn().mockResolvedValue(layoutSetsWithEntry),
      getFormLayoutSettings: jest.fn().mockResolvedValue(emptyLayoutSettings),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.metadata).toEqual({});
  });

  it('should return error when getLayoutSets fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const errorMessage = 'Failed to fetch layout sets';

    const { result } = renderHook({
      getLayoutSets: jest.fn().mockRejectedValue(new Error(errorMessage)),
    });

    await waitFor(() => expect(result.current.error).toBeDefined());

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.metadata).toEqual({});
    consoleErrorSpy.mockRestore();
  });

  it('should return error when getFormLayoutSettings fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const errorMessage = 'Failed to fetch layout settings';

    const { result } = renderHook({
      getLayoutSets: jest.fn().mockResolvedValue(layoutSetsWithEntry),
      getFormLayoutSettings: jest.fn().mockRejectedValue(new Error(errorMessage)),
    });

    await waitFor(() => expect(result.current.error).toBeDefined());

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.metadata).toEqual({});
    consoleErrorSpy.mockRestore();
  });
});

const renderHook = (queries: Partial<ServicesContextProps> = {}) => {
  const { renderHookResult } = renderHookWithProviders(queries)(() =>
    usePreviewLayoutMetadata(org, app),
  );
  return renderHookResult;
};
