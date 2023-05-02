import React from 'react';

import { Grid } from '@material-ui/core';
import Moment from 'moment';

import type { PropsFromGenericComponent } from '..';

import { AltinnSummaryTable } from 'src/components/table/AltinnSummaryTable';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { selectAppReceiver } from 'src/selectors/language';
import { getDateFormat } from 'src/utils/dateHelpers';
import type { IRuntimeState } from 'src/types';
import type { IInstance, ILanguage, IParty } from 'src/types/shared';

export const returnInstanceMetaDataObject = (
  language?: ILanguage | null | undefined,
  instanceDateSent?: string | boolean | null | undefined,
  instanceSender?: string | boolean | null | undefined,
  instanceReceiver?: string | boolean | null | undefined,
  instanceReferenceNumber?: string | boolean | null | undefined,
) => {
  const obj: any = {};
  if (!language) {
    return null;
  }

  if (instanceDateSent) {
    obj[getLanguageFromKey('receipt.date_sent', language)] = instanceDateSent;
  }

  if (instanceSender) {
    obj[getLanguageFromKey('receipt.sender', language)] = instanceSender;
  }

  if (instanceReceiver) {
    obj[getLanguageFromKey('receipt.receiver', language)] = instanceReceiver;
  }

  if (instanceReferenceNumber) {
    obj[getLanguageFromKey('receipt.ref_num', language)] = instanceReferenceNumber;
  }

  return obj;
};

export function InstanceInformationComponent({ node }: PropsFromGenericComponent<'InstanceInformation'>) {
  const elements = node.item.elements;
  const { dateSent, sender, receiver, referenceNumber } = elements || {};

  const instance: IInstance | null = useAppSelector((state: IRuntimeState) => state.instanceData.instance);
  const parties: IParty[] | null = useAppSelector((state: IRuntimeState) => state.party.parties);
  const language: ILanguage | null = useAppSelector((state) => state.language.language);
  const profileLanguage = useAppSelector(appLanguageStateSelector);
  const appReceiver = useAppSelector(selectAppReceiver);

  const instanceOwnerParty =
    instance && parties?.find((party: IParty) => party.partyId.toString() === instance.instanceOwner.partyId);

  const instanceDateSent =
    dateSent !== false && Moment(instance?.lastChanged).format(getDateFormat(undefined, profileLanguage));

  const instanceSender =
    sender !== false &&
    instanceOwnerParty &&
    language &&
    `${instanceOwnerParty.ssn ? instanceOwnerParty.ssn : instanceOwnerParty.orgNumber}-${instanceOwnerParty.name}`;

  const instanceReceiver = receiver !== false ? appReceiver ?? 'Error: Receiver org not found' : undefined;

  const instanceReferenceNumber = referenceNumber !== false && instance && instance.id.split('/')[1].split('-')[4];

  const instanceMetaDataObject = returnInstanceMetaDataObject(
    language,
    instanceDateSent,
    instanceSender,
    instanceReceiver,
    instanceReferenceNumber,
  );

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
