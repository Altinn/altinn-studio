import React from 'react';

import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { LayoutComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class AttachmentList extends LayoutComponent<'AttachmentList'> {
  render(props: PropsFromGenericComponent<'AttachmentList'>): JSX.Element | null {
    return <AttachmentListComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
