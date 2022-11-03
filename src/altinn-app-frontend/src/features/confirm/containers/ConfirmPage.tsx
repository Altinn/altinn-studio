import React from 'react';

import { ProcessNavigation } from 'src/components/presentation/ProcessNavigation';
import { returnConfirmSummaryObject } from 'src/features/confirm/helpers/returnConfirmSummaryObject';
import { ReadyForPrint } from 'src/shared/components/ReadyForPrint';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import type { ITextResource } from 'src/types';

import { AltinnReceipt } from 'altinn-shared/components';
import { mapInstanceAttachments } from 'altinn-shared/utils';
import { getAttachmentGroupings, getInstancePdf } from 'altinn-shared/utils/attachmentsUtils';
import type { IInstance, ILanguage, IParty } from 'altinn-shared/types';

export interface Props {
  instance: IInstance | null;
  parties: IParty[] | null;
  language: ILanguage | null;
  appName?: string;
  textResources: ITextResource[];
  applicationMetadata: IApplicationMetadata | null;
}

export const ConfirmPage = ({ instance, parties, language, appName, textResources, applicationMetadata }: Props) => {
  const getInstanceMetaObject = () => {
    if (instance?.org && applicationMetadata) {
      const instanceOwnerParty = parties?.find((party: IParty) => {
        return party.partyId.toString() === instance.instanceOwner.partyId;
      });
      return returnConfirmSummaryObject({
        languageData: language || undefined,
        instanceOwnerParty,
        textResources,
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

  if (!language) {
    return null;
  }

  const getText = (id, params = undefined) => getTextFromAppOrDefault(id, textResources, language, params, true);

  return (
    <>
      <AltinnReceipt
        attachmentGroupings={getAttachmentGroupings(getAttachments(), applicationMetadata, textResources)}
        body={appName && getTextFromAppOrDefault('confirm.body', textResources, language, [appName])}
        collapsibleTitle={getText('confirm.attachments')}
        hideCollapsibleCount={true}
        instanceMetaDataObject={getInstanceMetaObject()}
        title={getText('confirm.title')}
        titleSubmitted={getText('confirm.answers')}
        pdf={getInstancePdf(instance?.data)}
      />
      <ProcessNavigation language={language} />
      <ReadyForPrint />
    </>
  );
};
