import React from 'react';

import { TZDate } from '@date-fns/tz';
import { Grid } from '@material-ui/core';
import { formatDate, formatISO } from 'date-fns';

import type { PropsFromGenericComponent } from '..';

import { getDateFormat, PrettyDateAndTime } from 'src/app-components/Datepicker/utils/dateHelpers';
import { Fieldset } from 'src/app-components/Label/Fieldset';
import { AltinnSummaryTable } from 'src/components/table/AltinnSummaryTable';
import { useAppReceiver } from 'src/core/texts/appTexts';
import { useLaxInstanceData, useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useParties } from 'src/features/party/PartiesProvider';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useLabel } from 'src/utils/layout/useLabel';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { getInstanceOwnerParty } from 'src/utils/party';
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
  const selectedLanguage = useCurrentLanguage();

  const instanceOwner = useLaxInstanceData((data) => data.instanceOwner);
  const lastChanged = useLaxInstanceData((data) => data.lastChanged);
  const instanceId = useLaxInstanceId();
  const parties = useParties();
  const appReceiver = useAppReceiver();

  const instanceOwnerParty = getInstanceOwnerParty(instanceOwner, parties);

  const instanceDateSent =
    lastChanged &&
    dateSent !== false &&
    formatDate(
      new TZDate(new Date(formatISO(lastChanged)), 'Europe/Oslo'),
      getDateFormat(PrettyDateAndTime, selectedLanguage),
    );

  const instanceSender =
    sender !== false &&
    instanceOwnerParty &&
    `${instanceOwnerParty.ssn ? instanceOwnerParty.ssn : instanceOwnerParty.orgNumber}-${instanceOwnerParty.name}`;

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

  return (
    <Grid
      item={true}
      container={true}
      xs={12}
    >
      <AltinnSummaryTable summaryDataObject={instanceMetaDataObject} />
    </Grid>
  );
}

export function InstanceInformationComponent({
  node,
  overrideDisplay,
}: PropsFromGenericComponent<'InstanceInformation'>) {
  const elements = useNodeItem(node, (i) => i.elements);

  const { grid } = useNodeItem(node);
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
