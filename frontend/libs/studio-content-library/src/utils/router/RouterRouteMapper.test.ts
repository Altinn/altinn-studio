import { RouterRouteMapperImpl } from './RouterRouteMapper';
import { LandingPage } from '../../ContentLibrary/LibraryBody/pages/LandingPage';
import { CodeList } from '../../ContentLibrary/LibraryBody/pages/CodeList';
import { mockPagesConfig } from '../../../mocks/mockPagesConfig';

describe('RouterRouteMapperImpl', () => {
  it('should create configured routes correctly', () => {
    const routerMapper = new RouterRouteMapperImpl(mockPagesConfig);
    const routes = routerMapper.configuredRoutes;

    expect(routes.has('landingPage')).toBeTruthy();
    expect(routes.has('codeList')).toBeTruthy();
    expect(routes.get('landingPage')).toBe(LandingPage);
    expect(routes.get('codeList')).toBe(CodeList);
  });

  it('should always include landingPage even when noe pages are passed', () => {
    const routerMapper = new RouterRouteMapperImpl({});
    const routes = routerMapper.configuredRoutes;
    expect(routes.has('landingPage')).toBeTruthy();
    expect(routes.get('landingPage')).toBe(LandingPage);
  });

  it('should include configured routes only', () => {
    const routerMapper = new RouterRouteMapperImpl({
      codeList: {
        props: {
          codeLists: [],
          onUpdateCodeList: () => {},
          onUploadCodeList: () => {},
          fetchDataError: false,
        },
      },
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
