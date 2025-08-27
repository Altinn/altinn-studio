import { useBackToEditingHref } from './useBackToEditingHref';
import { typedLocalStorage } from '@studio/pure-functions';
import { renderHookWithProviders } from '../../../test/mocks';
import { app, org } from '@studio/testing/testids';
import { RoutePaths } from 'app-development/enums/RoutePaths';

const mockLayoutId: string = 'layout1';
const mockUiEditorPath: string = `/editor/${org}/${app}/${RoutePaths.UIEditor}`;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org,
    app,
  }),
}));

const renderUseBackToEditingHrefHook = () => renderHookWithProviders(useBackToEditingHref);

describe('useBackToEditingHref', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the correct URL with instanceId in the query parameters', () => {
    jest.spyOn(typedLocalStorage, 'getItem').mockReturnValue(mockLayoutId);
    const { result } = renderUseBackToEditingHrefHook();

    expect(result.current).toBe(mockUiEditorPath);
  });
});
