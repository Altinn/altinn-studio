import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PageLayout, PageLayouts } from '../types';
import { usePageLayoutsQuery } from './usePageLayoutsQuery';
import { useSavePageLayoutMutation } from './useSavePageLayoutMutation';

const org = 'org';
const app = 'app';
const layoutSetName = 'form';
const layoutsKey = [QueryKey.AppBuilderFormLayouts, org, app, layoutSetName];

const page = (...ids: string[]): PageLayout => ({
  $schema: '',
  data: { layout: ids.map((id) => ({ id, type: ComponentType.Paragraph })) },
});

// Side2 has a component that refers to "input" until the backend removes the reference.
const cachedLayouts: PageLayouts = { side1: page('input', 'other'), side2: page('summary') };
const layoutsAfterDelete: PageLayouts = { side1: page('other'), side2: page() };
const deleteInput = {
  pageName: 'side1',
  layout: page('other'),
  componentIdsChange: [{ oldComponentId: 'input', newComponentId: undefined }],
};

describe('useSavePageLayoutMutation', () => {
  it('loads the other pages again after a save that deletes a component', async () => {
    const getFormLayouts = vi.fn().mockResolvedValue(layoutsAfterDelete);
    const { result, queryClient } = renderSaveHook({ getFormLayouts });

    await act(() => result.current.save.mutateAsync(deleteInput));

    await waitFor(() => expect(getFormLayouts).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(queryClient.getQueryData<PageLayouts>(layoutsKey).side2).toEqual(page()),
    );
  });

  it('loads the layout settings again after a save that deletes a component', async () => {
    const { result, queryClient } = renderSaveHook();
    const settingsKey = [QueryKey.FormLayoutSettings, org, app, layoutSetName];
    queryClient.setQueryData(settingsKey, { pages: { order: ['side1', 'side2'] } });

    await act(() => result.current.save.mutateAsync(deleteInput));

    expect(queryClient.getQueryState(settingsKey).isInvalidated).toBe(true);
  });

  it('does not load the pages again after a save that changes no component IDs', async () => {
    const getFormLayouts = vi.fn().mockResolvedValue(layoutsAfterDelete);
    const { result, queryClient } = renderSaveHook({ getFormLayouts });

    await act(() => result.current.save.mutateAsync({ pageName: 'side1', layout: page('input') }));

    expect(getFormLayouts).not.toHaveBeenCalled();
    expect(queryClient.getQueryData<PageLayouts>(layoutsKey).side2).toEqual(page('summary'));
  });

  it('waits until no page is being saved, so a load does not undo another save', async () => {
    let finishSecondSave: () => void;
    // The save of side2 is still under way when the delete on side1 is done.
    const saveFormLayout = vi.fn((_org, _app, pageName: string) =>
      pageName === 'side2'
        ? new Promise<void>((resolve) => (finishSecondSave = resolve))
        : Promise.resolve(),
    );
    const getFormLayouts = vi.fn().mockResolvedValue(layoutsAfterDelete);
    const { result } = renderSaveHook({ saveFormLayout, getFormLayouts });

    let secondSave: Promise<unknown>;
    await act(async () => {
      secondSave = result.current.secondSave.mutateAsync({ pageName: 'side2', layout: page() });
      await result.current.save.mutateAsync(deleteInput);
    });
    expect(getFormLayouts).not.toHaveBeenCalled();

    await act(async () => {
      finishSecondSave();
      await secondSave;
    });
    await waitFor(() => expect(getFormLayouts).toHaveBeenCalledTimes(1));
  });
});

function renderSaveHook(services: Partial<ServicesContextProps> = {}) {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(layoutsKey, cachedLayouts);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ServicesContextProvider
      {...queriesMock}
      saveFormLayout={vi.fn().mockResolvedValue(undefined)}
      {...services}
      client={queryClient}
    >
      {children}
    </ServicesContextProvider>
  );
  const { result } = renderHook(
    () => ({
      // The canvas keeps the pages loaded, which is what makes them load again when invalidated.
      layouts: usePageLayoutsQuery(org, app, layoutSetName),
      save: useSavePageLayoutMutation(org, app, layoutSetName),
      secondSave: useSavePageLayoutMutation(org, app, layoutSetName),
    }),
    { wrapper },
  );
  return { result, queryClient };
}
