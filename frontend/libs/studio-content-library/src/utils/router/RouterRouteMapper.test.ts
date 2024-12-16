import { RouterRouteMapperImpl } from './RouterRouteMapper';
import { LandingPage } from '../../ContentLibrary/LibraryBody/pages/LandingPage';
import { CodeListPage } from '../../ContentLibrary/LibraryBody/pages/CodeListPage';
import { mockPagesConfig } from '../../../mocks/mockPagesConfig';

describe('RouterRouteMapperImpl', () => {
  it('should create configured routes correctly', () => {
    const routerMapper = new RouterRouteMapperImpl(mockPagesConfig);
    const routes = routerMapper.configuredRoutes;

    expect(routes.has('landingPage')).toBeTruthy();
    expect(routes.has('codeList')).toBeTruthy();
    expect(routes.get('landingPage')).toBe(LandingPage);
    expect(routes.get('codeList')).toBe(CodeListPage);
  });

  it('should always include landingPage even when noe pages are passed', () => {
    const routerMapper = new RouterRouteMapperImpl({});
    const routes = routerMapper.configuredRoutes;
    expect(routes.has('landingPage')).toBeTruthy();
    expect(routes.get('landingPage')).toBe(LandingPage);
  });

  it('should include configured routes only', () => {
    const routerMapper = new RouterRouteMapperImpl({
      codeList: mockPagesConfig.codeList,
    });
    const routes = routerMapper.configuredRoutes;
    expect(routes.has('codeList')).toBeTruthy();
    expect(routes.get('images')).toBeUndefined();
  });

  it('should not include unsupported routes', () => {
    const routerMapper = new RouterRouteMapperImpl(mockPagesConfig);
    const routes = routerMapper.configuredRoutes;
    expect(routes.has('nonExistentPage')).toBeFalsy();
  });
});
