import { type ComponentProps, type ReactElement } from 'react';
import { CodeListsWithTextResourcesPage } from '../../ContentLibrary/LibraryBody/pages/CodeListsWithTextResourcesPage';
import { PageName } from '../../types/PageName';
import { LandingPage } from '../../ContentLibrary/LibraryBody/pages/LandingPage';
import type { PagesConfig } from '../../types/PagesProps';
import { ImagesPage } from '../../ContentLibrary/LibraryBody/pages/ImagesPage';

type PageProps =
  | ComponentProps<typeof LandingPage>
  | ComponentProps<typeof CodeListsWithTextResourcesPage>
  | ComponentProps<typeof ImagesPage>;

export type PageComponent<P = PageProps> = (props: P) => ReactElement;

type PageMap = Map<PageName, PageComponent>;

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
    const pageMap = new Map<PageName, PageComponent>();

    pageMap.set(PageName.LandingPage, LandingPage);

    const configuredPages: PageName[] = Object.keys(pages) as PageName[];
    Object.values(PageName).forEach((pageName) => {
      if (configuredPages.includes(pageName)) {
        pageMap.set(pageName, pageNameToComponentMap[pageName]);
      }
    });

    return pageMap;
  }
}

const pageNameToComponentMap: {
  [Key in PageName]: (props: PagesConfig[Key]['props']) => ReactElement;
} = {
  [PageName.LandingPage]: LandingPage,
  [PageName.CodeListsWithTextResources]: CodeListsWithTextResourcesPage,
  [PageName.Images]: ImagesPage,
};
