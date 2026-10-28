import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Label, Paragraph, Tag, ValidationMessage } from '@digdir/designsystemet-react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { isTransferSent } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import classes from 'src/layout/BrokerFileTransfer/BrokerFileTransferSummary.module.css';
import { FileRow } from 'src/layout/BrokerFileTransfer/FileRow';
import { useChosenFile } from 'src/layout/BrokerFileTransfer/FileSender/useFilePick';
import { formatFileSize } from 'src/layout/BrokerFileTransfer/messages';
import { TransferFile } from 'src/layout/BrokerFileTransfer/TransferFile';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides } from 'src/layout/Summary2/summaryStoreContext';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

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

  const chosenFile = useChosenFile(targetBaseComponentId);
  const language = useCurrentLanguage();

  const title = summaryTitle || resolvedTitle;
  const { fileTransferId, fileName } = formData;
  const isSent = isTransferSent(formData);

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={
        fileTransferId || chosenFile
          ? SummaryContains.SomeUserContent
          : required
            ? SummaryContains.EmptyValueRequired
            : SummaryContains.EmptyValueNotRequired
      }
    >
      <div className={classes.summary}>
        <div className={classes.header}>
          <Label weight='regular'>{title && <Lang id={title} />}</Label>
          {!isSent && (
            <EditButton
              className={classes.editButton}
              targetBaseComponentId={targetBaseComponentId}
            />
          )}
        </div>
        {fileTransferId ? (
          <TransferFile
            fileTransferId={fileTransferId}
            fileName={fileName}
            isSent={isSent}
          />
        ) : chosenFile ? (
          // Only in this browser until the user sends it
          <FileRow
            name={chosenFile.name}
            details={formatFileSize(chosenFile.size, language)}
          >
            <Tag data-color='warning'>
              <Lang id='broker_file_transfer.not_sent' />
            </Tag>
          </FileRow>
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
