import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Label, Paragraph, ValidationMessage } from '@digdir/designsystemet-react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { isTransferReceived, isTransferSent } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import classes from 'src/layout/BrokerFileTransfer/BrokerFileTransferSummary.module.css';
import { SentFile } from 'src/layout/BrokerFileTransfer/SentFile/SentFile';
import { useFollowReceivedTransfer } from 'src/layout/BrokerFileTransfer/uploadState/useBrokerUpload';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides } from 'src/layout/Summary2/summaryStoreContext';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

/** Shows the component in a summary: the file transfer, or nothing until the user sends a file */
export function BrokerFileTransferSummary({ targetBaseComponentId }: Summary2Props) {
  const emptyFieldText = useSummaryOverrides(targetBaseComponentId)?.emptyFieldText;
  const errors = validationsOfSeverity(useUnifiedValidationsForNode(targetBaseComponentId), 'error');
  const config = useComponentConfig(targetBaseComponentId, 'BrokerFileTransfer');
  const { formData } = useDataModelBindings(useDataModelBindingsFor(targetBaseComponentId, 'BrokerFileTransfer'));
  const summaryTitle = useEvalOptionalText(
    config.textResourceBindings?.summaryTitle,
    Expressions.BrokerFileTransfer.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.BrokerFileTransfer.textResourceBindings.title,
  );
  const required = useEvalExpression(config.required, Expressions.BrokerFileTransfer.required);
  const readOnly = useEvalExpression(config.readOnly, Expressions.BrokerFileTransfer.readOnly);
  // The user may wait to submit on the summary's page, so the summary records Broker's status too until sendt
  useFollowReceivedTransfer(targetBaseComponentId, !readOnly);

  const title = summaryTitle || resolvedTitle;
  const { fileTransferId, fileName } = formData;
  const isReceived = isTransferReceived(formData);

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={
        fileTransferId
          ? SummaryContains.SomeUserContent
          : required
            ? SummaryContains.EmptyValueRequired
            : SummaryContains.EmptyValueNotRequired
      }
    >
      <div className={classes.summary}>
        <div className={classes.header}>
          <Label weight='regular'>{title && <Lang id={title} />}</Label>
          {!isReceived && (
            <EditButton
              className={classes.editButton}
              targetBaseComponentId={targetBaseComponentId}
            />
          )}
        </div>
        {fileTransferId ? (
          <SentFile
            fileTransferId={fileTransferId}
            fileName={fileName}
            state={isTransferSent(formData) ? 'sent' : isReceived ? 'checking' : 'notFullySent'}
          />
        ) : (
          <Paragraph
            asChild
            className={classes.empty}
          >
            <span>
              <Lang id={emptyFieldText ?? 'general.empty_summary'} />
            </span>
          </Paragraph>
        )}
        {errors.map(({ message }) => (
          <ValidationMessage
            key={message.key}
            data-size='sm'
          >
            <Lang
              id={message.key}
              params={message.params}
            />
          </ValidationMessage>
        ))}
      </div>
    </SummaryFlex>
  );
}
