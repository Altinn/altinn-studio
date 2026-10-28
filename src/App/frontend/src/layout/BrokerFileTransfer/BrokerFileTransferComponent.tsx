import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Alert, Paragraph } from '@digdir/designsystemet-react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { Label } from 'src/components/label/Label';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { isTransferSent } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import { FileSender } from 'src/layout/BrokerFileTransfer/FileSender/FileSender';
import { UnavailableFileSender } from 'src/layout/BrokerFileTransfer/FileSender/UnavailableFileSender';
import { TransferFile } from 'src/layout/BrokerFileTransfer/TransferFile';
import { useBrokerSetup } from 'src/layout/BrokerFileTransfer/useBrokerSetup';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { ComponentErrorList } from 'src/layout/GenericComponent';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

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
        <TransferFile
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
        <UnavailableFileSender
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
