import React from 'react';

import { ProcessNavigation } from 'src/components/presentation/ProcessNavigation';
import { returnConfirmSummaryObject } from 'src/features/confirm/helpers/returnConfirmSummaryObject';
import { ReadyForPrint } from 'src/shared/components/ReadyForPrint';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import type { ITextResource } from 'src/types';

import { AltinnReceipt } from 'altinn-shared/components';
import { mapInstanceAttachments } from 'altinn-shared/utils';
import {
  getAttachmentGroupings,
  getInstancePdf,
} from 'altinn-shared/utils/attachmentsUtils';
import type { IInstance, ILanguage, IParty } from 'altinn-shared/types';

export interface Props {
  instance: IInstance;
  parties: IParty[];
  language: ILanguage;
  appName: string;
  textResources: ITextResource[];
  applicationMetadata: IApplicationMetadata;
}

export const ConfirmPage = ({
  instance,
  parties,
  language,
  appName,
  textResources,
  applicationMetadata,
}: Props) => {
  const getInstanceMetaObject = () => {
    if (instance?.org && applicationMetadata) {
      const instanceOwnerParty = parties.find((party: IParty) => {
        return party.partyId.toString() === instance.instanceOwner.partyId;
      });
      return returnConfirmSummaryObject({
        languageData: language,
        instanceOwnerParty,
        textResources,
      });
    }
    return {};
  };

  const getAttachments = () => {
    if (instance?.data && applicationMetadata) {
      const appLogicDataTypes = applicationMetadata.dataTypes.filter(
        (dataType) => !!dataType.appLogic,
      );

      return mapInstanceAttachments(
        instance.data,
        appLogicDataTypes.map((type) => type.id),
      );
    }
  };
  const getText = (id, params = null, stringOutput = true) =>
    getTextFromAppOrDefault(id, textResources, language, params, stringOutput);
  return (
    <>
      <AltinnReceipt
        attachmentGroupings={getAttachmentGroupings(
          getAttachments(),
          applicationMetadata,
          textResources,
        )}
        body={getText('confirm.body', [appName], false)}
        collapsibleTitle={getText('confirm.attachments')}
        hideCollapsibleCount={true}
        instanceMetaDataObject={getInstanceMetaObject()}
        title={getText('confirm.title')}
        titleSubmitted={getText('confirm.answers')}
        pdf={getInstancePdf(instance.data)}
      />
      <ProcessNavigation language={language} />
      <ReadyForPrint />
    </>
  );
};
