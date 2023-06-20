import React from 'react';

import { ReceiptComponent } from 'src/components/organisms/AltinnReceipt';
import { ProcessNavigation } from 'src/components/presentation/ProcessNavigation';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { returnConfirmSummaryObject } from 'src/features/confirm/helpers/returnConfirmSummaryObject';
import { useLanguage } from 'src/hooks/useLanguage';
import { getAttachmentGroupings, getInstancePdf, mapInstanceAttachments } from 'src/utils/attachmentsUtils';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IInstance, IParty } from 'src/types/shared';

export interface IConfirmPageProps {
  instance: IInstance | null;
  parties: IParty[] | null;
  appName?: string;
  applicationMetadata: IApplicationMetadata | null;
}

export const ConfirmPage = ({ instance, parties, appName, applicationMetadata }: IConfirmPageProps) => {
  const langTools = useLanguage();
  const { lang } = langTools;
  const getInstanceMetaObject = () => {
    if (instance?.org && applicationMetadata) {
      const instanceOwnerParty = parties?.find(
        (party: IParty) => party.partyId.toString() === instance.instanceOwner.partyId,
      );
      return returnConfirmSummaryObject({
        instanceOwnerParty,
        langTools,
      });
    }
    return {};
  };

  const getAttachments = () => {
    if (instance?.data && applicationMetadata) {
      const appLogicDataTypes = applicationMetadata.dataTypes.filter((dataType) => !!dataType.appLogic);

      return mapInstanceAttachments(
        instance.data,
        appLogicDataTypes.map((type) => type.id),
      );
    }
  };

  return (
    <>
      <ReceiptComponent
        attachmentGroupings={getAttachmentGroupings(getAttachments(), applicationMetadata, langTools)}
        body={appName && lang('confirm.body', [appName])}
        collapsibleTitle={lang('confirm.attachments')}
        hideCollapsibleCount={true}
        instanceMetaDataObject={getInstanceMetaObject()}
        title={lang('confirm.title')}
        titleSubmitted={lang('confirm.answers')}
        pdf={getInstancePdf(instance?.data)}
      />
      <ProcessNavigation />
      <ReadyForPrint />
    </>
  );
};
