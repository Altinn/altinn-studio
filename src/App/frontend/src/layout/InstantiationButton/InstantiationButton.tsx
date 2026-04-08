import React from 'react';
import { useNavigate } from 'react-router';

import { Button } from 'src/app-components/Button/Button';
import { ErrorListFromInstantiation, ErrorReport } from 'src/components/message/ErrorReport';
import { parseInstanceId } from 'src/core/queries/instance';
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrap';
import { FD } from 'src/features/formData/FormDataWrite';
import { useInstantiation } from 'src/features/instantiate/useInstantiation';
import { useSetNavigationEffect } from 'src/features/navigation/NavigationEffectContext';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { focusMainContent } from 'src/hooks/useNavigatePage';
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
  const prefill = FD.useMapping(props.mapping, FormBootstrap.useDefaultDataType());
  const party = useSelectedParty();
  const setNavigationEffect = useSetNavigationEffect();
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
              setNavigationEffect({
                targetLocation: url,
                matchStart: true,
                callback: focusMainContent,
              });
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
