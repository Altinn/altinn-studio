import React from 'react';

import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class AttachmentList extends PresentationComponent<'AttachmentList'> {
  render(props: PropsFromGenericComponent<'AttachmentList'>): JSX.Element | null {
    return <AttachmentListComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
