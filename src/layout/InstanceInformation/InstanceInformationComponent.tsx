import React from 'react';

import { formatDate, formatISO } from 'date-fns';

import type { PropsFromGenericComponent } from '..';

import { PrettyDateAndTime } from 'src/app-components/Datepicker/utils/dateHelpers';
import { Fieldset } from 'src/app-components/Label/Fieldset';
import { AltinnSummaryTable } from 'src/components/table/AltinnSummaryTable';
import { useAppReceiver } from 'src/core/texts/appTexts';
import { useLaxInstanceData, useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useInstanceOwnerParty } from 'src/features/party/PartiesProvider';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { toTimeZonedDate } from 'src/utils/dateUtils';
import { useExternalItem } from 'src/utils/layout/hooks';
import { useLabel } from 'src/utils/layout/useLabel';
import type { SummaryDataObject } from 'src/components/table/AltinnSummaryTable';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { CompInternal } from 'src/layout/layout';

export const returnInstanceMetaDataObject = (
  langTools: IUseLanguage,
  instanceDateSent?: string | boolean | null | undefined,
  instanceSender?: string | boolean | null | undefined,
  instanceReceiver?: string | boolean | null | undefined,
  instanceReferenceNumber?: string | boolean | null | undefined,
) => {
  const obj: SummaryDataObject = {};
  const { langAsString } = langTools;

  if (instanceDateSent) {
    obj[langAsString('receipt.date_sent')] = {
      value: instanceDateSent,
      hideFromVisualTesting: true,
    };
  }

  if (instanceSender) {
    obj[langAsString('receipt.sender')] = {
      value: instanceSender,
    };
  }

  if (instanceReceiver) {
    obj[langAsString('receipt.receiver')] = {
      value: instanceReceiver,
    };
  }

  if (instanceReferenceNumber) {
    obj[langAsString('receipt.ref_num')] = {
      value: instanceReferenceNumber,
      hideFromVisualTesting: true,
    };
  }

  return obj;
};

export const getInstanceReferenceNumber = (instanceId: string): string => instanceId.split('/')[1].split('-')[4];

export function InstanceInformation({ elements }: Pick<CompInternal<'InstanceInformation'>, 'elements'>) {
  const { dateSent, sender, receiver, referenceNumber } = elements || {};

  const langTools = useLanguage();

  const lastChanged = useLaxInstanceData((data) => data.lastChanged);
  const instanceId = useLaxInstanceId();
  const appReceiver = useAppReceiver();

  const instanceOwnerParty = useInstanceOwnerParty();

  const instanceDateSent =
    lastChanged && dateSent !== false && formatDate(toTimeZonedDate(formatISO(lastChanged)), PrettyDateAndTime);

  const instanceSender =
    sender !== false &&
    instanceOwnerParty &&
    `${instanceOwnerParty.ssn ?? instanceOwnerParty.orgNumber}-${instanceOwnerParty.name}`;

  const instanceReceiver = receiver !== false ? (appReceiver ?? 'Error: Receiver org not found') : undefined;

  const instanceReferenceNumber = referenceNumber !== false && instanceId && getInstanceReferenceNumber(instanceId);

  const instanceMetaDataObject = returnInstanceMetaDataObject(
    langTools,
    instanceDateSent,
    instanceSender,
    instanceReceiver,
    instanceReferenceNumber,
  );

  if (!instanceMetaDataObject) {
    return null;
  }

  return <AltinnSummaryTable summaryDataObject={instanceMetaDataObject} />;
}

export function InstanceInformationComponent({
  node,
  overrideDisplay,
}: PropsFromGenericComponent<'InstanceInformation'>) {
  const { grid, elements } = useExternalItem(node.baseId, 'InstanceInformation');
  const { labelText, getDescriptionComponent, getHelpTextComponent } = useLabel({ node, overrideDisplay });

  return (
    <Fieldset
      grid={grid?.labelGrid}
      legend={labelText}
      description={getDescriptionComponent()}
      help={getHelpTextComponent()}
    >
      <ComponentStructureWrapper node={node}>
        <InstanceInformation elements={elements} />
      </ComponentStructureWrapper>
    </Fieldset>
  );
}
