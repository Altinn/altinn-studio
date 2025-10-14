import { PageName } from '../types/PageName';
import { Page } from './Page';
import type { PagePropsMap } from '../types/PagesProps';
import React from 'react';
import { CodeListsWithTextResourcesPage } from '../ContentLibrary/LibraryBody/pages/CodeListsWithTextResourcesPage';
import { CodeListsIcon } from '@studio/icons';

export class CodeListsWithTextResources extends Page<PageName.CodeListsWithTextResources> {
  readonly name: PageName.CodeListsWithTextResources = PageName.CodeListsWithTextResources;
  readonly titleKey = 'app_content_library.code_lists_with_text_resources.page_name';

  renderPageComponent(
    props: PagePropsMap<PageName.CodeListsWithTextResources>,
  ): React.ReactElement {
    return <CodeListsWithTextResourcesPage {...props} />;
  }

  renderIcon(): React.ReactElement {
    return <CodeListsIcon />;
  }
}
