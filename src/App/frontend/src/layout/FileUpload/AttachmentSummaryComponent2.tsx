import React from 'react';

import { useIsMobileOrTablet } from '@app/form-component';
import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';
import { Paragraph, ValidationMessage } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Label } from 'src/components/label/Label';
import { Lang } from 'src/features/language/Lang';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { FileTable } from 'src/layout/FileUpload/FileUploadTable/FileTable';
import classes from 'src/layout/FileUpload/FileUploadTable/FileTableComponent.module.css';
import { useUploaderSummaryData } from 'src/layout/FileUpload/Summary/summary';
import { fileUploadHasTag } from 'src/layout/FileUpload/Tag/hasTag';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { useSummaryLabelText } from 'src/layout/Summary2/CommonSummaryComponents/useSummaryLabelText';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentIsRequired } from 'src/utils/layout/useComponentIsRequired';
import { useEvalOptionalTrb } from 'src/utils/layout/useEvalExpression';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function AttachmentSummaryComponent2({ targetBaseComponentId }: Summary2Props) {
  const attachments = useUploaderSummaryData(targetBaseComponentId);
  const config = useComponentConfig<'FileUpload'>(targetBaseComponentId, (t) => t === 'FileUpload');
  const labelText = useSummaryLabelText(targetBaseComponentId);
  const summaryTitle = useEvalOptionalTrb(config, 'summaryTitle', CommonExpressions.TRBSummarizable);
  const title = useEvalOptionalTrb(config, 'title', CommonExpressions.TRBLabel);

  const hasTag = fileUploadHasTag(config);
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
  const required = useComponentIsRequired(config);
  const errors = validationsOfSeverity(useUnifiedValidationsForNode(targetBaseComponentId), 'error');
  const getUniqueKeyFromObject = useGetUniqueKeyFromObject();

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
      <div className={classes.summaryHeader}>
        <Label
          textResourceBindings={{
            ...labelText,
            title: summaryTitle || title,
          }}
          baseComponentId={targetBaseComponentId}
          overrideId={`attachment-summary2-${targetBaseComponentId}`}
          renderLabelAs='span'
          hideIndicators
          className={classes.summaryLabelMargin}
          weight='regular'
        />
        {isEmpty && (
          <EditButton
            className={classes.summaryEditButton}
            targetBaseComponentId={targetBaseComponentId}
          />
        )}
      </div>
      {filteredAttachments.length === 0 ? (
        <Paragraph asChild>
          <span className={cn(classes.emptyField, { [classes.error]: errors.length > 0 })}>
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
      {errors.map((validation) => (
        <ValidationMessage
          key={getUniqueKeyFromObject(validation)}
          data-size='sm'
        >
          <Lang
            id={validation.message.key}
            params={validation.message.params}
          />
        </ValidationMessage>
      ))}
    </SummaryFlex>
  );
}
