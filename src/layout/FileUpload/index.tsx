import React from 'react';

import { AttachmentSummaryComponent } from 'src/layout/FileUpload/AttachmentSummaryComponent';
import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { useUploaderSummaryData } from 'src/layout/FileUpload/shared/summary';
import { FormComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export class FileUpload extends FormComponent<'FileUpload'> {
  render(props: PropsFromGenericComponent<'FileUpload'>): JSX.Element | null {
    return <FileUploadComponent {...props} />;
  }

  renderDefaultValidations(): boolean {
    return false;
  }

  useDisplayData(node: LayoutNodeFromType<'FileUpload'>): string {
    return useUploaderSummaryData(node)
      .map((a) => a.name)
      .join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'FileUpload'>): JSX.Element | null {
    return <AttachmentSummaryComponent targetNode={targetNode} />;
  }

  canRenderInTable(): boolean {
    return false;
  }
}
