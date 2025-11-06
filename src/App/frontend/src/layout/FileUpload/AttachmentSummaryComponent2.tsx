import React from 'react';

import { Paragraph } from '@digdir/designsystemet-react';

import { Label } from 'src/components/label/Label';
import { Lang } from 'src/features/language/Lang';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { useIsMobileOrTablet } from 'src/hooks/useDeviceWidths';
import { FileTable } from 'src/layout/FileUpload/FileUploadTable/FileTable';
import classes from 'src/layout/FileUpload/FileUploadTable/FileTableComponent.module.css';
import { useUploaderSummaryData } from 'src/layout/FileUpload/Summary/summary';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useExternalItem } from 'src/utils/layout/hooks';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function AttachmentSummaryComponent2({ targetBaseComponentId }: Summary2Props) {
  const attachments = useUploaderSummaryData(targetBaseComponentId);
  const component = useExternalItem(targetBaseComponentId);
  const hasTag = component?.type === 'FileUploadWithTag';
  const { options, isFetching } = useOptionsFor(targetBaseComponentId, 'single');
  const mobileView = useIsMobileOrTablet();
  const pdfModeActive = usePdfModeActive();
  const isSmall = mobileView && !pdfModeActive;
  const filteredAttachments = attachments.filter((attachment) => {
    // If we have file upload with tags, we should hide files where the user have not yet
    // selected a tag, in the summary.
    if (!hasTag) {
      return attachment;
    }
    return attachment.data.tags && attachment.data.tags?.length > 0;
  });
  const isEmpty = filteredAttachments.length === 0;
  const required =
    useItemWhenType<'FileUpload' | 'FileUploadWithTag'>(
      targetBaseComponentId,
      (t) => t === 'FileUpload' || t === 'FileUploadWithTag',
    ).minNumberOfAttachments > 0;

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={
        isEmpty
          ? required
            ? SummaryContains.EmptyValueRequired
            : SummaryContains.EmptyValueNotRequired
          : SummaryContains.SomeUserContent
      }
    >
      <Label
        baseComponentId={targetBaseComponentId}
        overrideId={`attachment-summary2-${targetBaseComponentId}`}
        renderLabelAs='span'
        className={classes.summaryLabelMargin}
        weight='regular'
      />
      {filteredAttachments.length === 0 ? (
        <Paragraph asChild>
          <span className={classes.emptyField}>
            <Lang id='general.empty_summary' />
          </span>
        </Paragraph>
      ) : (
        <FileTable
          baseComponentId={targetBaseComponentId}
          mobileView={isSmall}
          attachments={filteredAttachments}
          options={options}
          isSummary={true}
          isFetching={isFetching}
        />
      )}
    </SummaryFlex>
  );
}
