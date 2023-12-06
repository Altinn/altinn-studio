import React from 'react';

import { ReceiptComponent } from 'src/components/organisms/AltinnReceipt';
import { ProcessNavigation } from 'src/components/presentation/ProcessNavigation';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { returnConfirmSummaryObject } from 'src/features/confirm/helpers/returnConfirmSummaryObject';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import {
  filterDisplayAttachments,
  filterDisplayPdfAttachments,
  getAttachmentGroupings,
} from 'src/utils/attachmentsUtils';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IInstance, IParty } from 'src/types/shared';

export interface IConfirmPageProps {
  instance: IInstance | undefined;
  parties: IParty[] | undefined;
  appName?: string;
  applicationMetadata: IApplicationMetadata | null;
}

export const ConfirmPage = ({ instance, parties, appName, applicationMetadata }: IConfirmPageProps) => {
  const langTools = useLanguage();
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

      return filterDisplayAttachments(
        instance.data,
        appLogicDataTypes.map((type) => type.id),
      );
    }
  };

  return (
    <>
      <ReceiptComponent
        attachmentGroupings={getAttachmentGroupings(getAttachments(), applicationMetadata, langTools)}
        body={
          appName && (
            <Lang
              id={'confirm.body'}
              params={[appName]}
            />
          )
        }
        collapsibleTitle={<Lang id={'confirm.attachments'} />}
        hideCollapsibleCount={true}
        instanceMetaDataObject={getInstanceMetaObject()}
        title={<Lang id={'confirm.title'} />}
        titleSubmitted={<Lang id={'confirm.answers'} />}
        pdf={filterDisplayPdfAttachments(instance?.data ?? [])}
      />
      <ProcessNavigation />
      <ReadyForPrint />
    </>
  );
};
