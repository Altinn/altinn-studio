import React from 'react';

import { InstanceInformation as InstanceInformationLayout, PrettyDateAndTime } from '@app/form-component';
import { formatDate, formatISO } from 'date-fns';
import type { InstanceSummaryDataObject } from '@app/form-component';

import type { PropsFromGenericComponent } from '..';

import { useAppReceiver } from 'src/core/texts/appTexts';
import { useInstanceDataQuery, useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useInstanceOwnerParty } from 'src/features/party/PartiesProvider';
import { toTimeZonedDate } from 'src/utils/dateUtils';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { CompInternal } from 'src/layout/layout';

export const returnInstanceMetaDataObject = (
  langTools: IUseLanguage,
  instanceDateSent?: string | boolean | null | undefined,
  instanceSender?: string | boolean | null | undefined,
  instanceReceiver?: string | boolean | null | undefined,
  instanceReferenceNumber?: string | boolean | null | undefined,
) => {
  const obj: InstanceSummaryDataObject = {};
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

function useInstanceSummaryData(elements: CompInternal<'InstanceInformation'>['elements']): InstanceSummaryDataObject {
  const { dateSent, sender, receiver, referenceNumber } = elements || {};
  const langTools = useLanguage();
  const lastChanged = useInstanceDataQuery({ select: (data) => data.lastChanged }).data;
  const instanceId = useLaxInstanceId();
  const appReceiver = useAppReceiver();
  const instanceOwnerParty = useInstanceOwnerParty();

  const instanceDateSent =
    lastChanged && dateSent !== false && formatDate(toTimeZonedDate(formatISO(lastChanged)), PrettyDateAndTime);

  const identifier = instanceOwnerParty?.ssn ?? instanceOwnerParty?.orgNumber;
  const instanceSender =
    sender !== false &&
    instanceOwnerParty &&
    (identifier ? `${identifier}-${instanceOwnerParty.name}` : instanceOwnerParty.name);

  const instanceReceiver = receiver !== false ? (appReceiver ?? 'Error: Receiver org not found') : undefined;

  const instanceReferenceNumber = referenceNumber !== false && instanceId && getInstanceReferenceNumber(instanceId);

  return returnInstanceMetaDataObject(
    langTools,
    instanceDateSent,
    instanceSender,
    instanceReceiver,
    instanceReferenceNumber,
  );
}

export function InstanceInformation({ elements }: Pick<CompInternal<'InstanceInformation'>, 'elements'>) {
  const summaryDataObject = useInstanceSummaryData(elements);

  if (!summaryDataObject) {
    return null;
  }

  return <InstanceInformationLayout summaryDataObject={summaryDataObject} />;
}

export function InstanceInformationComponent({
  baseComponentId,
  overrideDisplay,
}: PropsFromGenericComponent<'InstanceInformation'>) {
  const { grid, elements, textResourceBindings } = useItemWhenType(baseComponentId, 'InstanceInformation');
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  const summaryDataObject = useInstanceSummaryData(elements);

  const renderLabel = overrideDisplay?.renderLabel ?? true;
  const inTable = overrideDisplay?.renderedInTable === true;
  const showLabel = renderLabel && !inTable;

  if (!summaryDataObject) {
    return null;
  }

  return (
    <InstanceInformationLayout
      componentId={componentId}
      summaryDataObject={summaryDataObject}
      title={showLabel ? textResourceBindings?.title : undefined}
      description={showLabel ? textResourceBindings?.description : undefined}
      help={showLabel ? textResourceBindings?.help : undefined}
      labelGrid={grid?.labelGrid}
      innerGrid={innerGrid}
    />
  );
}
