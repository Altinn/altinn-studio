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

  it('should not leak the route module export names onto the route object', () => {
    const converted = convertRouteModule({ default: Component, clientLoader: () => null });

    expect(converted).not.toHaveProperty('default');
    expect(converted).not.toHaveProperty('clientLoader');
    expect(converted).not.toHaveProperty('clientAction');
  });
});
