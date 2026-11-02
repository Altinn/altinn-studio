import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Alert, Paragraph } from '@digdir/designsystemet-react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { Label } from 'src/components/label/Label';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { isTransferSent } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import { ChooseFile } from 'src/layout/BrokerFileTransfer/ChooseFile/ChooseFile';
import { ChooseFileWithoutBroker } from 'src/layout/BrokerFileTransfer/ChooseFile/ChooseFileWithoutBroker';
import { SentFile } from 'src/layout/BrokerFileTransfer/SentFile/SentFile';
import { useBrokerSetup } from 'src/layout/BrokerFileTransfer/setup/useBrokerSetup';
import { UploadingFile } from 'src/layout/BrokerFileTransfer/UploadingFile/UploadingFile';
import { useBrokerUpload } from 'src/layout/BrokerFileTransfer/uploadState/useBrokerUpload';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { ComponentErrorList } from 'src/layout/GenericComponent';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ReadySetup } from 'src/layout/BrokerFileTransfer/setup/useBrokerSetup';

// Decides what the component shows, such as the file picker, the upload or the sent file

export function BrokerFileTransferComponent({ baseComponentId }: PropsFromGenericComponent<'BrokerFileTransfer'>) {
  const config = useComponentConfig(baseComponentId, 'BrokerFileTransfer');
  const readOnly = useEvalExpression(config.readOnly, Expressions.BrokerFileTransfer.readOnly);
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'BrokerFileTransfer');
  const { formData } = useDataModelBindings(dataModelBindings);
  const setup = useBrokerSetup(baseComponentId);

  const isSent = isTransferSent(formData);
  if (!isSent && setup.kind === 'misconfigured') {
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
      {isSent ? (
        <SentFile
          fileTransferId={formData.fileTransferId}
          fileName={formData.fileName}
          isSent
        />
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

// Its own component, because useBrokerUpload can only run once the setup is ready
function FileSender({ baseComponentId, setup }: FileSenderProps) {
  const upload = useBrokerUpload(baseComponentId, setup);

  if (upload.active) {
    return (
      <UploadingFile
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
