import React, { useEffect, useState } from 'react';

import moment from 'moment';

import { useAppDispatch } from 'src/common/hooks/useAppDispatch';
import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { useInstanceIdParams } from 'src/common/hooks/useInstanceIdParams';
import { AltinnContentIconReceipt } from 'src/components/atoms/AltinnContentIconReceipt';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { ReceiptComponent } from 'src/components/organisms/AltinnReceipt';
import { ReceiptComponentSimple } from 'src/components/organisms/AltinnReceiptSimple';
import { CustomReceipt } from 'src/features/customReceipt/containers/CustomReceipt';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { ReadyForPrint } from 'src/shared/components/ReadyForPrint';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import { getAttachmentGroupings, getInstancePdf, mapInstanceAttachments } from 'src/utils/attachmentsUtils';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { returnUrlToArchive } from 'src/utils/urls/urlHelper';
import type { IAttachment, IParty } from 'src/types/shared';

export const returnInstanceMetaDataObject = (
  orgsData: any,
  languageData: any,
  instanceOwnerParty: any,
  instanceGuid: string,
  userLanguageString: string,
  lastChangedDateTime: string,
  org: any,
) => {
  const obj: any = {};

  obj[getLanguageFromKey('receipt.date_sent', languageData)] = lastChangedDateTime;

  let sender = '';
  if (instanceOwnerParty?.ssn) {
    sender = `${instanceOwnerParty.ssn}-${instanceOwnerParty.name}`;
  } else if (instanceOwnerParty?.orgNumber) {
    sender = `${instanceOwnerParty.orgNumber}-${instanceOwnerParty.name}`;
  }
  obj[getLanguageFromKey('receipt.sender', languageData)] = sender;

  if (orgsData[org]) {
    obj[getLanguageFromKey('receipt.receiver', languageData)] = orgsData[org].name[userLanguageString];
  } else {
    // This is only related to testing in Altinn Studio Dev
    obj[getLanguageFromKey('receipt.receiver', languageData)] = 'Error: Receiver org not found';
  }

  obj[getLanguageFromKey('receipt.ref_num', languageData)] = instanceGuid.split('-')[4];

  return obj;
};

export const ReceiptContainer = () => {
  const dispatch = useAppDispatch();
  const [attachments, setAttachments] = useState<IAttachment[]>([]);
  const [pdf, setPdf] = useState<IAttachment[] | undefined>(undefined);
  const [lastChangedDateTime, setLastChangedDateTime] = useState('');
  const [instanceMetaObject, setInstanceMetaObject] = useState({});
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
      const instanceOwnerParty = parties.find((party: IParty) => {
        return party.partyId.toString() === instance.instanceOwner.partyId;
      });

      const obj = returnInstanceMetaDataObject(
        allOrgs,
        language,
        instanceOwnerParty,
        instanceGuid,
        userLanguage,
        lastChangedDateTime,
        instance.org,
      );
      setInstanceMetaObject(obj);
    }
  }, [allOrgs, parties, instance, lastChangedDateTime, language, instanceGuid, userLanguage]);

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
