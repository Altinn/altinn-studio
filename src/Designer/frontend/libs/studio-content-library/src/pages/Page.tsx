import type { PageName } from '../types/PageName';
import React from 'react';
import type { PagePropsMap } from '../types/PagesProps';
import { useTranslation } from 'react-i18next';
import { pageRouterQueryParamKey } from '../utils/router/QueryParamsRouter';
import { StudioContentMenu } from '@studio/components-legacy';
import { Link } from 'react-router-dom';
import type { ContentLibraryConfig } from '../types/ContentLibraryConfig';

export abstract class Page<Name extends PageName> {
  abstract readonly name: Name;
  abstract readonly titleKey: string;

  isConfigured(config: ContentLibraryConfig): boolean {
    return !!config.pages[this.name];
  }

  renderPage(config: ContentLibraryConfig): React.ReactElement {
    const props: PagePropsMap<Name> = this.extractProps(config);
    return this.renderPageComponent(props);
  }

  extractProps(config: ContentLibraryConfig): PagePropsMap<Name> {
    /* istanbul ignore else */
    if (config.pages[this.name]) return config.pages[this.name].props;
    else throw new Error(`No configuration found for ${this.name}.`);
  }

  abstract renderPageComponent(props: PagePropsMap<Name>): React.ReactElement;

  renderTab(): React.ReactElement {
    const title = this.useTitle();
    return (
      <StudioContentMenu.LinkTab
        key={this.name}
        icon={this.renderIcon()}
        tabId={this.name}
        tabName={title}
        renderTab={this.renderLink}
      />
    );
  }

  private useTitle(): string {
    /* Eslint misinterprets this as a class component, while it's really just a hook used in a functional component within a class */
    /* eslint-disable-next-line react-hooks/rules-of-hooks */
    const { t } = useTranslation();
    return t(this.titleKey);
  }

  abstract renderIcon(): React.ReactElement;

  private renderLink = (props: React.HTMLAttributes<HTMLAnchorElement>): React.ReactElement => {
    return <Link to={this.link} {...props} />;
  };

  private get link(): string {
    return `?${pageRouterQueryParamKey}=${this.name}`;
  }
}
