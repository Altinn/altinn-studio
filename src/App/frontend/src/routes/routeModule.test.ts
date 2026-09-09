import { convertRouteModule } from 'src/routes/routeModule';

describe('convertRouteModule', () => {
  const Component = () => null;

  it('should map the default export to Component', () => {
    const converted = convertRouteModule({ default: Component });

    expect(converted.Component).toBe(Component);
  });

  it('should map clientLoader to loader and clientAction to action', () => {
    const clientLoader = () => null;
    const clientAction = () => null;

    const converted = convertRouteModule({ default: Component, clientLoader, clientAction });

    expect(converted.loader).toBe(clientLoader);
    expect(converted.action).toBe(clientAction);
  });

  it('should leave loader and action undefined when the module exports neither', () => {
    const converted = convertRouteModule({ default: Component });

    expect(converted.loader).toBeUndefined();
    expect(converted.action).toBeUndefined();
  });

  it('should pass the remaining route module exports through untouched', () => {
    const ErrorBoundary = () => null;
    const HydrateFallback = () => null;
    const shouldRevalidate = () => true;
    const handle = { some: 'value' };

    const converted = convertRouteModule({
      default: Component,
      ErrorBoundary,
      HydrateFallback,
      shouldRevalidate,
      handle,
    });

    expect(converted.ErrorBoundary).toBe(ErrorBoundary);
    expect(converted.HydrateFallback).toBe(HydrateFallback);
    expect(converted.shouldRevalidate).toBe(shouldRevalidate);
    expect(converted.handle).toBe(handle);
  });

  it('should copy nothing but the supported route object fields', () => {
    // The route module export names are renamed rather than copied, and `path`, `index` and `children`
    // must stay with the router configuration. A route module has no business exporting the latter, but
    // a module namespace object is structurally assignable to RouteModule, so TypeScript cannot say so.
    const routeModule = {
      default: Component,
      clientLoader: () => null,
      path: 'somewhere-else',
      index: true,
      children: [],
    };

    const converted = convertRouteModule(routeModule);

    expect(Object.keys(converted).sort()).toEqual([
      'Component',
      'ErrorBoundary',
      'HydrateFallback',
      'action',
      'handle',
      'loader',
      'shouldRevalidate',
    ]);
  });
});
