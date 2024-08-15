import { RouterConfig, RouterRouteConfig } from './RouterRouteConfig';
import { libraryEntryPoint } from '../router';

export class StudioResourceLibrary {
  public readonly routerRouteConfig: RouterRouteConfig;

  constructor(private routerConfig: RouterConfig) {
    this.routerRouteConfig = new RouterRouteConfig(this.routerConfig);
  }

  public renderStudioResourceLibrary(): void {
    return libraryEntryPoint(this.routerRouteConfig);
  }
}
