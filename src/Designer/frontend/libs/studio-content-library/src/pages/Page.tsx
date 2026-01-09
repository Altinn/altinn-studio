import type { PageName } from '../types/PageName';
import React from 'react';
import type { ComponentProps } from 'react';
import type { PagePropsMap, PagesConfig } from '../types/PagesProps';
import { useTranslation } from 'react-i18next';
import { StudioContentMenu } from '@studio/components';
import type { ContentLibraryConfig } from '../types/ContentLibraryConfig';
import { Guard } from '@studio/pure-functions';

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
    Guard.againstMissingProperty<PagesConfig, Name>(config.pages, this.name);
    return config.pages[this.name] as PagePropsMap<Name>;
  }

  abstract renderPageComponent(props: PagePropsMap<Name>): React.ReactElement;

  renderTab(
    renderLink: (
      pageName: string,
      anchorAttributes: React.HTMLAttributes<HTMLAnchorElement>,
    ) => React.ReactElement,
  ): React.ReactElement {
    return (
      <LinkTab
        key={this.name}
        icon={this.renderIcon()}
        tabId={this.name}
        titleKey={this.titleKey}
        renderTab={(props) => renderLink(this.name, props)}
      />
    );
  }

  abstract renderIcon(): React.ReactElement;
}

type LinkTabProps = Omit<ComponentProps<typeof StudioContentMenu.LinkTab>, 'tabName'> & {
  titleKey: string;
};

function LinkTab({ titleKey, ...rest }: LinkTabProps): React.ReactElement {
  const { t } = useTranslation();
  return <StudioContentMenu.LinkTab tabName={t(titleKey)} {...rest} />;
}
