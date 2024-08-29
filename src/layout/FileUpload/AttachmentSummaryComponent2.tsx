import React from 'react';

import { Label } from 'src/components/label/Label';
import { useNodeOptions } from 'src/features/options/useNodeOptions';
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
  const hasTag = targetNode.isType('FileUploadWithTag');
  const { options, isFetching } = useNodeOptions(targetNode as LayoutNode<'FileUploadWithTag'>);
  const mobileView = useIsMobileOrTablet();
  const pdfModeActive = usePdfModeActive();
  const isSmall = mobileView && !pdfModeActive;

  return (
    <>
      <Label
        node={targetNode}
        overrideId={`attachment-summary2-${targetNode.id}`}
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
        isFetching={isFetching}
      />
    </>
  );
}
