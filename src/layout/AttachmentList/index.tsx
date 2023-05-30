import React from 'react';

import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompAttachmentList } from 'src/layout/AttachmentList/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class AttachmentList extends PresentationComponent<'AttachmentList'> {
  render(props: PropsFromGenericComponent<'AttachmentList'>): JSX.Element | null {
    return <AttachmentListComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }

  canRenderInTable(): boolean {
    return false;
  }
}

export const Config = {
  def: new AttachmentList(),
};

export type TypeConfig = {
  layout: ILayoutCompAttachmentList;
  nodeItem: ExprResolved<ILayoutCompAttachmentList>;
  nodeObj: LayoutNode;
};
