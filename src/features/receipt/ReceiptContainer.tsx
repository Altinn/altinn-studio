import React, { useEffect, useState } from 'react';

import moment from 'moment';

import { AltinnContentIconReceipt } from 'src/components/atoms/AltinnContentIconReceipt';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { ReceiptComponent } from 'src/components/organisms/AltinnReceipt';
import { ReceiptComponentSimple } from 'src/components/organisms/AltinnReceiptSimple';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { InstanceDataActions } from 'src/features/instanceData/instanceDataSlice';
import { CustomReceipt } from 'src/features/receipt/CustomReceipt';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useInstanceIdParams } from 'src/hooks/useInstanceIdParams';
import { getAppReceiver, getLanguageFromKey } from 'src/language/sharedLanguage';
import { getAttachmentGroupings, getInstancePdf, mapInstanceAttachments } from 'src/utils/attachmentsUtils';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { returnUrlToArchive } from 'src/utils/urls/urlHelper';
import type { SummaryDataObject } from 'src/components/table/AltinnSummaryTable';
import type { ITextResource } from 'src/types';
import type { IAltinnOrgs, IAttachment, ILanguage, IParty } from 'src/types/shared';

export const returnInstanceMetaDataObject = (
  orgsData: IAltinnOrgs,
  languageData: ILanguage,
  textResources: ITextResource[],
  instanceOwnerParty: IParty | undefined,
  instanceGuid: string,
  userLanguageString: string,
  lastChangedDateTime: string,
  org: string,
) => {
  const obj: SummaryDataObject = {};

  obj[getLanguageFromKey('receipt.date_sent', languageData)] = {
    value: lastChangedDateTime,
    hideFromVisualTesting: true,
  };

  let sender = '';
  if (instanceOwnerParty?.ssn) {
    sender = `${instanceOwnerParty.ssn}-${instanceOwnerParty.name}`;
  } else if (instanceOwnerParty?.orgNumber) {
    sender = `${instanceOwnerParty.orgNumber}-${instanceOwnerParty.name}`;
  }
  obj[getLanguageFromKey('receipt.sender', languageData)] = {
    value: sender,
  };

  const receiver = getAppReceiver(textResources, orgsData, org, userLanguageString);
  if (receiver) {
    obj[getLanguageFromKey('receipt.receiver', languageData)] = {
      value: receiver,
    };
  } else {
    // This is only related to testing in Altinn Studio Dev
    obj[getLanguageFromKey('receipt.receiver', languageData)] = {
      value: 'Error: Receiver org not found',
    };
  }

  obj[getLanguageFromKey('receipt.ref_num', languageData)] = {
    value: instanceGuid.split('-')[4],
    hideFromVisualTesting: true,
  };

  return obj;
};

export const ReceiptContainer = () => {
  const dispatch = useAppDispatch();
  const [attachments, setAttachments] = useState<IAttachment[]>([]);
  const [pdf, setPdf] = useState<IAttachment[] | undefined>(undefined);
  const [lastChangedDateTime, setLastChangedDateTime] = useState('');
  const [instanceMetaObject, setInstanceMetaObject] = useState<SummaryDataObject>({});
  const [userLanguage, setUserLanguage] = useState('nb');

  const receiptLayoutName = useAppSelector((state) => state.formLayout.uiConfig.receiptLayoutName);
  const allOrgs = useAppSelector((state) => state.organisationMetaData.allOrgs);
  const applicationMetadata = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  const instance = useAppSelector((state) => state.instanceData.instance);
  const language = useAppSelector((state) => state.language.language);
  const parties = useAppSelector((state) => state.party.parties);
  const textResources = useAppSelector((state) => state.textResources.resources);
  const profile = useAppSelector((state) => state.profile.profile);
  const layouts = useAppSelector((state) => Object.keys(state.formLayout.layouts || {}));

  const origin = window.location.origin;

  const { instanceGuid, instanceId } = useInstanceIdParams();

  useEffect(() => {
    dispatch(
      InstanceDataActions.get({
        instanceId,
      }),
    );
  }, [instanceId, dispatch]);

  useEffect(() => {
    if (profile && profile.profileSettingPreference) {
      setUserLanguage(profile.profileSettingPreference.language);
    }
  }, [profile]);

  useEffect(() => {
    if (allOrgs != null && instance && instance.org && allOrgs && parties && instanceGuid) {
      const instanceOwnerParty = parties.find(
        (party: IParty) => party.partyId.toString() === instance.instanceOwner.partyId,
      );

      const obj = returnInstanceMetaDataObject(
        allOrgs,
        language ?? {},
        textResources,
        instanceOwnerParty,
        instanceGuid,
        userLanguage,
        lastChangedDateTime,
        instance.org,
      );
      setInstanceMetaObject(obj);
    }
  }, [allOrgs, parties, instance, lastChangedDateTime, language, instanceGuid, userLanguage, textResources]);

  useEffect(() => {
    if (instance && instance.data && applicationMetadata) {
      const appLogicDataTypes = applicationMetadata.dataTypes.filter((dataType) => !!dataType.appLogic);

      const attachmentsResult = mapInstanceAttachments(
        instance.data,
        appLogicDataTypes.map((type) => type.id),
      );
      setAttachments(attachmentsResult);
      setPdf(getInstancePdf(instance.data));
      setLastChangedDateTime(moment(instance.lastChanged).format('DD.MM.YYYY / HH:mm'));
    }
  }, [instance, applicationMetadata]);

  return (
    <div id='ReceiptContainer'>
      {attachments &&
      applicationMetadata &&
      instanceMetaObject &&
      lastChangedDateTime &&
      allOrgs &&
      instance &&
      language &&
      parties ? (
        <>
          {!applicationMetadata.autoDeleteOnProcessEnd &&
            (receiptLayoutName && layouts.includes(receiptLayoutName) ? (
              <CustomReceipt />
            ) : (
              <ReceiptComponent
                attachmentGroupings={getAttachmentGroupings(attachments, applicationMetadata, textResources)}
                body={getTextFromAppOrDefault('receipt.body', textResources, language)}
                collapsibleTitle={getTextFromAppOrDefault('receipt.attachments', textResources, language)}
                instanceMetaDataObject={instanceMetaObject}
                subtitle={getTextFromAppOrDefault('receipt.subtitle', textResources, language)}
                subtitleurl={returnUrlToArchive(origin) || undefined}
                title={getTextFromAppOrDefault('receipt.title', textResources, language)}
                titleSubmitted={getTextFromAppOrDefault('receipt.title_submitted', textResources, language)}
                pdf={pdf || undefined}
              />
            ))}
          {applicationMetadata.autoDeleteOnProcessEnd && (
            <ReceiptComponentSimple
              body={getTextFromAppOrDefault('receipt.body_simple', textResources, language, undefined, false)}
              title={getTextFromAppOrDefault('receipt.title', textResources, language)}
            />
          )}
          <ReadyForPrint />
        </>
      ) : (
        <AltinnContentLoader
          width={705}
          height={561}
        >
          <AltinnContentIconReceipt />
        </AltinnContentLoader>
      )}
    </div>
  );
};
