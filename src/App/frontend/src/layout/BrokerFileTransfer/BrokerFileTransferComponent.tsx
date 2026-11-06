import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Alert, Paragraph } from '@digdir/designsystemet-react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { Label } from 'src/components/label/Label';
import { useBrokerFileTransferOverviewQuery } from 'src/core/queries/brokerFileTransfer';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { isTransferFailed, isTransferReceived } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import classes from 'src/layout/BrokerFileTransfer/BrokerFileTransferComponent.module.css';
import { ChecksumField } from 'src/layout/BrokerFileTransfer/ChecksumField';
import { ChooseFile } from 'src/layout/BrokerFileTransfer/ChooseFile/ChooseFile';
import { ChooseFileWithoutBroker } from 'src/layout/BrokerFileTransfer/ChooseFile/ChooseFileWithoutBroker';
import { SentFile } from 'src/layout/BrokerFileTransfer/SentFile/SentFile';
import { getBrokerApiBaseUrl, useBrokerSetup } from 'src/layout/BrokerFileTransfer/setup/useBrokerSetup';
import { UploadingFile } from 'src/layout/BrokerFileTransfer/UploadingFile/UploadingFile';
import {
  useBrokerUpload,
  useFollowReceivedTransfer,
  useRemoveTransfer,
} from 'src/layout/BrokerFileTransfer/uploadState/useBrokerUpload';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { ComponentErrorList } from 'src/layout/GenericComponent';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ReadySetup } from 'src/layout/BrokerFileTransfer/setup/useBrokerSetup';

/**
 * Lets the user upload a large file from the form and send it to other organizations with Altinn Broker (Altinn Formidling)
 */
export function BrokerFileTransferComponent({ baseComponentId }: PropsFromGenericComponent<'BrokerFileTransfer'>) {
  const config = useComponentConfig(baseComponentId, 'BrokerFileTransfer');
  const readOnly = useEvalExpression(config.readOnly, Expressions.BrokerFileTransfer.readOnly);
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'BrokerFileTransfer');
  const { formData } = useDataModelBindings(dataModelBindings);
  const setup = useBrokerSetup(baseComponentId);
  useFollowReceivedTransfer(baseComponentId, !readOnly);
  const removeTransfer = useRemoveTransfer(baseComponentId);

  const isReceived = isTransferReceived(formData);
  const isFailed = isTransferFailed(formData);
  if (!isReceived && !isFailed && setup.kind === 'misconfigured') {
    return (
      <ComponentErrorList
        baseComponentId={baseComponentId}
        errors={setup.errors}
      />
    );
  }

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Label
        baseComponentId={baseComponentId}
        renderLabelAs='plainLabel'
      />
      {isReceived || isFailed ? (
        <div className={classes.sent}>
          <SentFile
            fileTransferId={formData.fileTransferId}
            fileTransferStatus={formData.fileTransferStatus}
            fileName={formData.fileName}
            showChecksum={!config.checksum}
            onRemove={isFailed && !readOnly ? removeTransfer : undefined}
          />
          <SentChecksum
            baseComponentId={baseComponentId}
            fileTransferId={formData.fileTransferId}
          />
        </div>
      ) : readOnly ? (
        <Paragraph data-size='sm'>
          <Lang id='broker_file_transfer.none_sent' />
        </Paragraph>
      ) : setup.kind === 'ready' ? (
        <FileSender
          baseComponentId={baseComponentId}
          setup={setup}
        />
      ) : setup.kind === 'unavailable' ? (
        <ChooseFileWithoutBroker
          baseComponentId={baseComponentId}
          maxFileSize={setup.maxFileSize}
        />
      ) : setup.kind === 'problem' ? (
        <Alert data-color='warning'>
          <Lang
            id={setup.message.key}
            params={setup.message.params}
          />
        </Alert>
      ) : (
        <AltinnSpinner />
      )}
    </ComponentStructureWrapper>
  );
}

type FileSenderProps = {
  baseComponentId: string;
  setup: ReadySetup;
};

function FileSender({ baseComponentId, setup }: FileSenderProps) {
  const upload = useBrokerUpload(baseComponentId, setup);

  if (upload.active) {
    return (
      <UploadingFile
        baseComponentId={baseComponentId}
        active={upload.active}
        progress={upload.progress}
        onPause={upload.pause}
        onResume={upload.resume}
        onCancel={upload.cancel}
      />
    );
  }

  return (
    <ChooseFile
      baseComponentId={baseComponentId}
      setup={setup}
      interrupted={upload.interrupted}
      sendError={upload.sendError}
      onSend={upload.send}
      onContinue={upload.continueInterrupted}
      onDiscard={upload.discardInterrupted}
    />
  );
}

type SentChecksumProps = {
  baseComponentId: string;
  fileTransferId: string;
};

function SentChecksum({ baseComponentId, fileTransferId }: SentChecksumProps) {
  const overview = useBrokerFileTransferOverviewQuery(getBrokerApiBaseUrl(), fileTransferId).data;
  return (
    <ChecksumField
      baseComponentId={baseComponentId}
      value={overview?.checksum ?? ''}
    />
  );
}
