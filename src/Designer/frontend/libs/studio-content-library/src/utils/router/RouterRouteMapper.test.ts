import { RouterRouteMapperImpl } from './RouterRouteMapper';
import { LandingPage } from '../../ContentLibrary/LibraryBody/pages/LandingPage';
import { CodeListsWithTextResourcesPage } from '../../ContentLibrary/LibraryBody/pages/CodeListsWithTextResourcesPage';
import { mockPagesConfig } from '../../../mocks/mockPagesConfig';
import { PageName } from '../../types/PageName';

describe('RouterRouteMapperImpl', () => {
  it('should create configured routes correctly', () => {
    const routerMapper = new RouterRouteMapperImpl(mockPagesConfig);
    const routes = routerMapper.configuredRoutes;

    expect(routes.has(PageName.LandingPage)).toBeTruthy();
    expect(routes.has(PageName.CodeListsWithTextResources)).toBeTruthy();
    expect(routes.get(PageName.LandingPage)).toBe(LandingPage);
    expect(routes.get(PageName.CodeListsWithTextResources)).toBe(CodeListsWithTextResourcesPage);
  });

  it('should always include landingPage even when noe pages are passed', () => {
    const routerMapper = new RouterRouteMapperImpl({});
    const routes = routerMapper.configuredRoutes;
    expect(routes.has(PageName.LandingPage)).toBeTruthy();
    expect(routes.get(PageName.LandingPage)).toBe(LandingPage);
  });

  it('should include configured routes only', () => {
    const routerMapper = new RouterRouteMapperImpl({
      codeListsWithTextResources: mockPagesConfig.codeListsWithTextResources,
    });
    const routes = routerMapper.configuredRoutes;
    expect(routes.has(PageName.CodeListsWithTextResources)).toBeTruthy();
    expect(routes.get(PageName.Images)).toBeUndefined();
  });

  it('should not include unsupported routes', () => {
    const routerMapper = new RouterRouteMapperImpl(mockPagesConfig);
    const routes = routerMapper.configuredRoutes;
    expect(routes.has('nonExistentPage' as PageName)).toBeFalsy();
  });
});
