import { PageName } from '../types/PageName';
import { Page } from './Page';
import type { PagePropsMap } from '../types/PagesProps';
import React from 'react';
import { ImagesPage } from '../ContentLibrary/LibraryBody/pages/ImagesPage';
import { ImageIcon } from '@studio/icons';

export class Images extends Page<PageName.Images> {
  readonly name: PageName.Images = PageName.Images;
  readonly titleKey = 'app_content_library.images.page_name';

  renderPageComponent(props: PagePropsMap<PageName.Images>): React.ReactElement {
    return <ImagesPage {...props} />;
  }

  renderIcon(): React.ReactElement {
    return <ImageIcon />;
  }
}
