import React from 'react';

import { Button } from 'src/app-components/Button/Button';
import { ErrorListFromInstantiation, ErrorReport } from 'src/components/message/ErrorReport';
import { useIsProcessing } from 'src/core/contexts/processingContext';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useInstantiation } from 'src/features/instantiate/InstantiationContext';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import type { IInstantiationButtonComponentProvidedProps } from 'src/layout/InstantiationButton/InstantiationButtonComponent';

type Props = Omit<React.PropsWithChildren<IInstantiationButtonComponentProvidedProps>, 'text'>;

// TODO(Datamodels): This uses mapping and therefore only supports the "default" data model
export const InstantiationButton = ({ children, ...props }: Props) => {
  const instantiation = useInstantiation();
  const { performProcess, isAnyProcessing, isThisProcessing: isLoading } = useIsProcessing();
  const prefill = FD.useMapping(props.mapping, DataModels.useDefaultDataType());
  const party = useSelectedParty();

  return (
    <ErrorReport
      show={instantiation.error !== undefined}
      errors={instantiation.error ? <ErrorListFromInstantiation error={instantiation.error} /> : undefined}
    >
      <Button
        {...props}
        id={props.node.id}
        onClick={() =>
          performProcess(() =>
            instantiation.instantiateWithPrefill(
              {
                prefill,
                instanceOwner: {
                  partyId: party?.partyId.toString(),
                },
              },
              true,
            ),
          )
        }
        disabled={isAnyProcessing}
        isLoading={isLoading}
        variant='secondary'
        color='first'
      >
        {children}
      </Button>
    </ErrorReport>
  );
};
