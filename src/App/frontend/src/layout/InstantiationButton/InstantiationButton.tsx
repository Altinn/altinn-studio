import React from 'react';
import { useNavigate } from 'react-router';

import { InstantiationButton as InstantiationButtonLayout } from '@app/form-component';
import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';

import { ErrorListFromInstantiation, ErrorReport } from 'src/components/message/ErrorReport';
import { parseInstanceId } from 'src/core/queries/instance';
import { useInstantiation } from 'src/features/instantiate/useInstantiation';
import { useResolvedQueryParameters } from 'src/features/options/evalQueryParameters';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { useIsAnyProcessing, useIsThisProcessing, useProcessingMutation } from 'src/hooks/useProcessingMutation';
import { buildInstanceUrl } from 'src/routesBuilder';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export type InstantiationButtonRuntimeProps = PropsFromGenericComponent<'InstantiationButton'> & {
  addPageMargin?: boolean;
};

export const InstantiationButton = ({ addPageMargin, baseComponentId }: InstantiationButtonRuntimeProps) => {
  const config = useComponentConfig(baseComponentId, 'InstantiationButton');
  const title = useEvalExpression(config.textResourceBindings?.title, CommonExpressions.TRBLabel.title);
  const instantiation = useInstantiation();
  const performProcess = useProcessingMutation('instantiation');
  const isLoading = useIsThisProcessing('instantiation');
  const isAnyProcessing = useIsAnyProcessing();
  const prefill = useResolvedQueryParameters(config.queryParameters) ?? {};
  const party = useSelectedParty();
  const navigate = useNavigate();
  const componentId = useIndexedId(baseComponentId);

  return (
    <ErrorReport
      show={instantiation.error !== undefined}
      errors={instantiation.error ? <ErrorListFromInstantiation error={instantiation.error} /> : undefined}
    >
      <InstantiationButtonLayout
        componentId={componentId}
        title={title}
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
