import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useChangePageOrderMutation } from './useChangePageOrderMutation';
import { useChangePageGroupOrder } from './useChangePageGroupOrder';
import { renderHookWithProviders } from '../../testing/mocks';
import { app, layoutSet, org } from '@designer/testing/testids';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';

const pages: PagesModel = { pages: [{ id: 'Side2' }, { id: 'Side1' }] };

describe('moving pages', () => {
  it.each([
    ['in order', () => useChangePageOrderMutation(org, app, layoutSet)],
    ['in groups', () => useChangePageGroupOrder(org, app, layoutSet)],
  ])('tells the preview that the page settings changed, %s', async (_, hook) => {
    const updateLayoutSettingsForPreview = vi.fn();
    const { result } = renderHookWithProviders(hook, {
      appContextProps: { updateLayoutSettingsForPreview },
    });

    result.current.mutate(pages);

    await waitFor(() => expect(updateLayoutSettingsForPreview).toHaveBeenCalledWith(layoutSet));
  });
});
