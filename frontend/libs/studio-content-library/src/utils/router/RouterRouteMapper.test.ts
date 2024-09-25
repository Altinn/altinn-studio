import { RouterRouteMapperImpl } from './RouterRouteMapper'; // Adjust the import path as necessary
import { Root } from '../../pages/Root';
import { CodeList } from '../../pages/CodeList';
import { PageConfig } from '../../types/PagesProps';

const mockPageConfig: PageConfig = {
  root: {
    props: {
      title: 'Hello',
      children: '<h2>Welcome</h2>',
    },
  },
  codeList: {
    props: {
      title: 'CodeList',
    },
  },
};

describe('RouterRouteMapperImpl', () => {
  it('should create configured routes correctly', () => {
    const routerMapper = new RouterRouteMapperImpl(mockPageConfig);
    const routes = routerMapper.configuredRoutes;

    expect(routes.has('root')).toBeTruthy();
    expect(routes.has('codeList')).toBeTruthy();
    expect(routes.get('root')).toBe(Root);
    expect(routes.get('codeList')).toBe(CodeList);
  });

  it('should include configured routes only', () => {
    const routerMapper = new RouterRouteMapperImpl({
      root: {
        props: {
          title: 'Hello',
          children: '<h2>Welcome</h2>',
        },
      },
    });
    const routes = routerMapper.configuredRoutes;
    expect(routes.has('root')).toBeTruthy();
    expect(routes.get('codeList')).toBeUndefined();
  });

  it('should not include unsupported routes', () => {
    const routerMapper = new RouterRouteMapperImpl(mockPageConfig);
    const routes = routerMapper.configuredRoutes;
    expect(routes.has('nonExistentPage')).toBeFalsy();
  });
});
