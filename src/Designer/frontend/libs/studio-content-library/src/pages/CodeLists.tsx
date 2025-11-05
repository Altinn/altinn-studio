import { PageName } from '../types/PageName';
import { Page } from './Page';
import type { PagePropsMap } from '../types/PagesProps';
import React from 'react';
import { CodeListsPage } from '../ContentLibrary/LibraryBody/pages/CodeListsPage';
import { CodeListsIcon } from '@studio/icons';

export class CodeLists extends Page<PageName.CodeLists> {
  readonly name: PageName.CodeLists = PageName.CodeLists;
  readonly titleKey = 'app_content_library.code_lists.page_name';

  renderPageComponent(props: PagePropsMap<PageName.CodeLists>): React.ReactElement {
    return <CodeListsPage {...props} />;
  }

  renderIcon(): React.ReactElement {
    return <CodeListsIcon />;
  }
}
