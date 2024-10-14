import React from 'react';
import { Helmet } from 'react-helmet-async';

import { ReceiptComponent } from 'src/components/organisms/AltinnReceipt';
import { ProcessNavigation } from 'src/components/presentation/ProcessNavigation';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppOwner } from 'src/core/texts/appTexts';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { returnConfirmSummaryObject } from 'src/features/processEnd/confirm/helpers/returnConfirmSummaryObject';
import {
  filterDisplayAttachments,
  filterDisplayPdfAttachments,
  getAttachmentGroupings,
} from 'src/utils/attachmentsUtils';
import { getPageTitle } from 'src/utils/getPageTitle';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IInstance, IParty } from 'src/types/shared';

export interface IConfirmPageProps {
  instance: IInstance | undefined;
  parties: IParty[] | undefined;
  instanceOwnerParty?: IParty;
  appName: string;
  applicationMetadata: ApplicationMetadata | null;
}

export const ConfirmPage = ({ instance, instanceOwnerParty, appName, applicationMetadata }: IConfirmPageProps) => {
  const langTools = useLanguage();

  const appOwner = useAppOwner();

  const getInstanceMetaObject = () => {
    if (instance?.org && applicationMetadata) {
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
      <Helmet>
        <title>{`${getPageTitle(appName, langTools.langAsString('confirm.title'), appOwner)}`}</title>
      </Helmet>
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
