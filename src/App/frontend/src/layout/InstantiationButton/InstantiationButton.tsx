import React from 'react';
import { useNavigate } from 'react-router';

import { InstantiationButton as InstantiationButtonLayout } from '@app/form-component';

import { ErrorListFromInstantiation, ErrorReport } from 'src/components/message/ErrorReport';
import { parseInstanceId } from 'src/core/queries/instance';
import { FormStore } from 'src/features/form/FormContext';
import { useInstantiation } from 'src/features/instantiate/useInstantiation';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { useIsAnyProcessing, useIsThisProcessing, useProcessingMutation } from 'src/hooks/useProcessingMutation';
import { buildInstanceUrl } from 'src/routesBuilder';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import type { IButtonProvidedProps } from 'src/layout/Button/ButtonComponent';

export type InstantiationButtonRuntimeProps = Omit<IButtonProvidedProps, 'text'> & {
  addPageMargin?: boolean;
  children?: React.ReactNode;
};

// TODO(Datamodels): This uses mapping and therefore only supports the "default" data model
export const InstantiationButton = ({
  addPageMargin,
  children: _children,
  ...props
}: InstantiationButtonRuntimeProps) => {
  const instantiation = useInstantiation();
  const performProcess = useProcessingMutation('instantiation');
  const isLoading = useIsThisProcessing('instantiation');
  const isAnyProcessing = useIsAnyProcessing();
  const prefill = FormStore.data.useMapping(props.mapping, FormStore.bootstrap.useDefaultDataType());
  const party = useSelectedParty();
  const navigate = useNavigate();
  const componentId = useIndexedId(props.baseComponentId);

  return (
    <ErrorReport
      show={instantiation.error !== undefined}
      errors={instantiation.error ? <ErrorListFromInstantiation error={instantiation.error} /> : undefined}
    >
      <InstantiationButtonLayout
        componentId={componentId}
        title={props.textResourceBindings?.title}
        addPageMargin={addPageMargin}
        disabled={isAnyProcessing}
        isLoading={isLoading}
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
              await navigate(url);
            }
          })
        }
      />
    </ErrorReport>
  );
};
