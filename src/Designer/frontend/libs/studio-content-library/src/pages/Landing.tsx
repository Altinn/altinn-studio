import { PageName } from '../types/PageName';
import { Page } from './Page';
import type { PagePropsMap } from '../types/PagesProps';
import React from 'react';
import { LandingPage } from '../ContentLibrary/LibraryBody/pages/LandingPage';
import { BookIcon } from '@studio/icons';

export class Landing extends Page<PageName.LandingPage> {
  readonly name: PageName.LandingPage = PageName.LandingPage;
  readonly titleKey = 'app_content_library.landing_page.page_name';

  isConfigured(): boolean {
    return true;
  }

  extractProps(): PagePropsMap<PageName.LandingPage> {
    return {};
  }

  renderPageComponent(props: PagePropsMap<PageName.LandingPage>): React.ReactElement {
    return <LandingPage {...props} />;
  }

  renderIcon(): React.ReactElement {
    return <BookIcon />;
  }
}
