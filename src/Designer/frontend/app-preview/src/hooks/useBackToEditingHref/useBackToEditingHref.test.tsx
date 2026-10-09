import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBackToEditingHref } from './useBackToEditingHref';
import { typedLocalStorage } from '@studio/pure-functions';
import { renderHookWithProviders } from '../../../test/mocks';
import { app, org } from '@studio/testing/testids';
import { RoutePaths } from 'app-development/enums/RoutePaths';

const mockLayoutId: string = 'layout1';
const mockUiEditorPath: string = `/editor/${org}/${app}/${RoutePaths.UIEditor}`;

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useParams: () => ({
    org,
    app,
  }),
}));

const renderUseBackToEditingHrefHook = () => renderHookWithProviders(useBackToEditingHref);

describe('useBackToEditingHref', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the correct URL with instanceId in the query parameters', () => {
    vi.spyOn(typedLocalStorage, 'getItem').mockReturnValue(mockLayoutId);
    const { result } = renderUseBackToEditingHrefHook();

    expect(result.current).toBe(mockUiEditorPath);
  });
});
