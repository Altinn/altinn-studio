import React from 'react';
import { useNavigate } from 'react-router';

import { Button } from 'src/app-components/Button/Button';
import { ErrorListFromInstantiation, ErrorReport } from 'src/components/message/ErrorReport';
import { parseInstanceId } from 'src/core/queries/instance';
import { FormStore } from 'src/features/form/FormContext';
import { useInstantiation } from 'src/features/instantiate/useInstantiation';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { useIsAnyProcessing, useIsThisProcessing, useProcessingMutation } from 'src/hooks/useProcessingMutation';
import { buildInstanceUrl } from 'src/routesBuilder';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import type { IInstantiationButtonComponentProvidedProps } from 'src/layout/InstantiationButton/InstantiationButtonComponent';

type Props = Omit<React.PropsWithChildren<IInstantiationButtonComponentProvidedProps>, 'text'>;

// TODO(Datamodels): This uses mapping and therefore only supports the "default" data model
export const InstantiationButton = ({ children, ...props }: Props) => {
  const instantiation = useInstantiation();
  const performProcess = useProcessingMutation('instantiation');
  const isLoading = useIsThisProcessing('instantiation');
  const isAnyProcessing = useIsAnyProcessing();
  const prefill = FormStore.data.useMapping(props.mapping, FormStore.bootstrap.useDefaultDataType());
  const party = useSelectedParty();
  const navigate = useNavigate();

  return (
    <ErrorReport
      show={instantiation.error !== undefined}
      errors={instantiation.error ? <ErrorListFromInstantiation error={instantiation.error} /> : undefined}
    >
      <Button
        id={useIndexedId(props.baseComponentId)}
        onClick={() =>
          performProcess(async () => {
            const data = await instantiation.instantiateWithPrefill(
              {
                prefill,
                instanceOwner: {
                  partyId: party?.partyId.toString(),
                },
              },
              { force: true },
            );
            if (data) {
              const { instanceOwnerPartyId, instanceGuid } = parseInstanceId(data.id);
              const url = buildInstanceUrl(instanceOwnerPartyId, instanceGuid);
              navigate(url);
            }
          })
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
