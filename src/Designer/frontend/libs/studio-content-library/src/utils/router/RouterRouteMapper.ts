import { type ComponentProps, type ReactElement } from 'react';
import { CodeListsWithTextResourcesPage } from '../../ContentLibrary/LibraryBody/pages/CodeListsWithTextResourcesPage';
import type { PageName } from '../../types/PageName';
import { LandingPage } from '../../ContentLibrary/LibraryBody/pages/LandingPage';
import type { PagesConfig } from '../../types/PagesProps';
import { ImagesPage } from '../../ContentLibrary/LibraryBody/pages/ImagesPage';
import { CodeListsPage } from '../../ContentLibrary/LibraryBody/pages/CodeListsPage';

type PageProps =
  | ComponentProps<typeof LandingPage>
  | ComponentProps<typeof CodeListsWithTextResourcesPage>
  | ComponentProps<typeof ImagesPage>;

export type PageComponent<P = PageProps> = (props: P) => ReactElement;

type PageMap = Map<string, PageComponent>;

interface RouterRouteMapper {
  configuredRoutes: PageMap;
}

export class RouterRouteMapperImpl implements RouterRouteMapper {
  private readonly _configuredRoutes: PageMap;

  public get configuredRoutes(): PageMap {
    return this._configuredRoutes;
  }

  constructor(private pages: PagesConfig) {
    this._configuredRoutes = this.getConfiguredRoutes(this.pages);
  }

  private getConfiguredRoutes(pages: PagesConfig): PageMap {
    const pageMap = new Map<string, PageComponent>();

    pageMap.set('landingPage', LandingPage);

    Object.keys(pages).forEach((page: PageName) => {
      switch (page) {
        case 'codeLists':
          pageMap.set('codeLists', CodeListsPage);
          break;
        case 'codeListsWithTextResources':
          pageMap.set('codeListsWithTextResources', CodeListsWithTextResourcesPage);
          break;
        case 'images':
          pageMap.set('images', ImagesPage);
          break;
      }
    });

    return pageMap;
  }
}
