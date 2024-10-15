import { RouterRouteMapperImpl } from './RouterRouteMapper';
import { LandingPage } from '../../ContentLibrary/pages/LandingPage';
import { CodeList } from '../../ContentLibrary/pages/CodeList';
import type { PagesConfig } from '../../types/PagesProps';

const mockPageConfig: PagesConfig = {
  codeList: {
    props: {
      codeLists: [
        { title: 'CodeList1', codeList: {} },
        { title: 'CodeList2', codeList: {} },
      ],
      onUpdateCodeList: () => {},
    },
  },
  images: {
    props: {
      images: [{ title: 'image', imageSrc: 'www.external-image-url.com' }],
      onUpdateImage: () => {},
    },
  },
};

describe('RouterRouteMapperImpl', () => {
  it('should create configured routes correctly', () => {
    const routerMapper = new RouterRouteMapperImpl(mockPageConfig);
    const routes = routerMapper.configuredRoutes;

    expect(routes.has('landingPage')).toBeTruthy();
    expect(routes.has('codeList')).toBeTruthy();
    expect(routes.get('landingPage').implementation).toBe(LandingPage);
    expect(routes.get('codeList').implementation).toBe(CodeList);
  });

  it('should include configured routes only', () => {
    const routerMapper = new RouterRouteMapperImpl({
      landingPage: {
        props: {
          title: 'Hello',
          children: '<h2>Welcome</h2>',
        },
      },
    });
    const routes = routerMapper.configuredRoutes;
    expect(routes.has('landingPage')).toBeTruthy();
    expect(routes.get('codeList')).toBeUndefined();
  });

  it('should not include unsupported routes', () => {
    const routerMapper = new RouterRouteMapperImpl(mockPageConfig);
    const routes = routerMapper.configuredRoutes;
    expect(routes.has('nonExistentPage')).toBeFalsy();
  });
});
