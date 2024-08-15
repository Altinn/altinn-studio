import React from 'react';

import { Label } from 'src/components/label/Label';
import {
  AttachmentsMappedToFormDataProvider,
  useAttachmentsMappedToFormData,
} from 'src/features/attachments/useAttachmentsMappedToFormData';
import { useAllOptions } from 'src/features/options/useAllOptions';
import { usePdfModeActive } from 'src/features/pdf/PDFWrapper';
import { useIsMobileOrTablet } from 'src/hooks/useIsMobile';
import { FileTable } from 'src/layout/FileUpload/FileUploadTable/FileTable';
import classes from 'src/layout/FileUpload/FileUploadTable/FileTableComponent.module.css';
import { useUploaderSummaryData } from 'src/layout/FileUpload/Summary/summary';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IAttachmentSummaryComponent {
  targetNode: LayoutNode<'FileUpload' | 'FileUploadWithTag'>;
}

export function AttachmentSummaryComponent2({ targetNode }: IAttachmentSummaryComponent) {
  const attachments = useUploaderSummaryData(targetNode);
  const component = targetNode.item;
  const allOptions = useAllOptions();
  const hasTag = component.type === 'FileUploadWithTag';
  const options = hasTag ? allOptions[component.id] : undefined;
  const mappingTools = useAttachmentsMappedToFormData(targetNode);
  const mobileView = useIsMobileOrTablet();
  const pdfModeActive = usePdfModeActive();
  const isSmall = mobileView && !pdfModeActive;

  return (
    <AttachmentsMappedToFormDataProvider mappingTools={mappingTools}>
      <Label
        id={`attachment-summary2-${targetNode.item.id}`}
        textResourceBindings={targetNode.item.textResourceBindings}
        renderLabelAs='span'
        className={classes.summaryLabelMargin}
        weight={'regular'}
      />
      <FileTable
        node={targetNode}
        mobileView={isSmall}
        attachments={attachments.filter((attachment) => {
          // If we have file upload with tags, we should hide files where the use have not yet
          // selected a tag, in the summary.
          if (!hasTag) {
            return attachment;
          }
          return attachment.data.tags && attachment.data.tags?.length > 0;
        })}
        options={options}
        isSummary={true}
      />
    </AttachmentsMappedToFormDataProvider>
  );
}
