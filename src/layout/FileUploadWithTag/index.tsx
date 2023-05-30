import React from 'react';

import { useUploaderSummaryData } from 'src/layout/FileUpload/shared/summary';
import { AttachmentWithTagSummaryComponent } from 'src/layout/FileUploadWithTag/AttachmentWithTagSummaryComponent';
import { FileUploadWithTagComponent } from 'src/layout/FileUploadWithTag/FileUploadWithTagComponent';
import { FormComponent } from 'src/layout/LayoutComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompFileUploadWithTag } from 'src/layout/FileUploadWithTag/types';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class FileUploadWithTag extends FormComponent<'FileUploadWithTag'> {
  render(props: PropsFromGenericComponent<'FileUploadWithTag'>): JSX.Element | null {
    return <FileUploadWithTagComponent {...props} />;
  }

  renderDefaultValidations(): boolean {
    return false;
  }

  useDisplayData(node: LayoutNodeFromType<'FileUploadWithTag'>): string {
    return useUploaderSummaryData(node)
      .map((a) => a.name)
      .join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'FileUploadWithTag'>): JSX.Element | null {
    return <AttachmentWithTagSummaryComponent targetNode={targetNode} />;
  }

  canRenderInTable(): boolean {
    return false;
  }
}

export const Config = {
  def: new FileUploadWithTag(),
};

export type TypeConfig = {
  layout: ILayoutCompFileUploadWithTag;
  nodeItem: ExprResolved<ILayoutCompFileUploadWithTag>;
  nodeObj: LayoutNode;
};
