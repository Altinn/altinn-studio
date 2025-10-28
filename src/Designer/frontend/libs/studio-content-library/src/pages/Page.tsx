import type { PageName } from '../types/PageName';
import React, { ComponentProps, ReactElement } from 'react';
import type { PagePropsMap } from '../types/PagesProps';
import { useTranslation } from 'react-i18next';
import { pageRouterQueryParamKey } from '../utils/router/QueryParamsRouter';
import { StudioContentMenu } from '@studio/components';
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
    return (
      <LinkTab
        key={this.name}
        icon={this.renderIcon()}
        tabId={this.name}
        titleKey={this.titleKey}
        renderTab={this.renderLink}
      />
    );
  }

  abstract renderIcon(): React.ReactElement;

  private renderLink = (props: React.HTMLAttributes<HTMLAnchorElement>): React.ReactElement => {
    return <Link to={this.link} {...props} />;
  };

  private get link(): string {
    return `?${pageRouterQueryParamKey}=${this.name}`;
  }
}

type LinkTabProps = Omit<ComponentProps<typeof StudioContentMenu.LinkTab>, 'tabName'> & {
  titleKey: string;
};

function LinkTab({ titleKey, ...rest }: LinkTabProps): ReactElement {
  const { t } = useTranslation();
  return <StudioContentMenu.LinkTab tabName={t(titleKey)} {...rest} />;
}
