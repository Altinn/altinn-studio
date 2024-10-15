import { type ComponentProps, type ReactElement } from 'react';
import { CodeList } from '../../ContentLibrary/pages/CodeList';
import type { PageName } from '../../types/PageName';
import { LandingPage } from '../../ContentLibrary/pages/LandingPage';
import type { PagesConfig } from '../../types/PagesProps';
import type { InfoBoxProps } from '../../types/InfoBoxProps';
import { Images } from '../../ContentLibrary/pages/Images/Images';
import { infoBoxConfigs } from '../../ContentLibrary/infoBox/infoBoxConfigs';

type PageProps = ComponentProps<typeof LandingPage | typeof CodeList>;

type PageComponent<P = PageProps> = (props: P) => ReactElement;

type PageElements = {
  implementation: PageComponent;
  infoBox?: InfoBoxProps;
};

type PageMap = Map<string, PageElements>;

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
    const pageMap = new Map<string, PageElements>();

    pageMap.set('landingPage', { implementation: LandingPage });

    Object.keys(pages).forEach((page: PageName) => {
      if (page === 'codeList') {
        pageMap.set('codeList', {
          implementation: CodeList,
          infoBox: infoBoxConfigs[page],
        });
      }
      if (page === 'images') {
        pageMap.set('images', {
          implementation: Images,
          infoBox: infoBoxConfigs[page],
        });
      }
    });

    return pageMap;
  }
}
