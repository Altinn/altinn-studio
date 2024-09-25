import { type ComponentProps, type ReactElement } from 'react';
import { Root } from '../../pages/Root';
import { CodeList } from '../../pages/CodeList';
import type { PageConfig } from '../../types/PagesProps';

type PageProps = ComponentProps<typeof Root | typeof CodeList>;

type PageComponent<P = PageProps> = (props: P) => ReactElement;

type PageMap = Map<string, PageComponent>;

interface RouterRouteMapper {
  configuredRoutes: PageMap;
}

export class RouterRouteMapperImpl implements RouterRouteMapper {
  private readonly _configuredRoutes: PageMap;

  public get configuredRoutes(): PageMap {
    return this._configuredRoutes;
  }

  constructor(private pages: Partial<PageConfig>) {
    this._configuredRoutes = this.getConfiguredRoutes(this.pages);
  }

  private getConfiguredRoutes(pages: Partial<PageConfig>): PageMap {
    const pageMap = new Map<string, (props: PageProps) => ReactElement>();

    Object.keys(pages).forEach((page) => {
      if (page === 'root') {
        pageMap.set('root', Root);
      }

      if (page === 'codeList') {
        pageMap.set('codeList', CodeList);
      }
    });

    return pageMap;
  }
}
