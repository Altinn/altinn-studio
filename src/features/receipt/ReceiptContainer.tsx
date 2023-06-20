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
import { useLanguage } from 'src/hooks/useLanguage';
import { getAppReceiver } from 'src/language/sharedLanguage';
import { getAttachmentGroupings, getInstancePdf, mapInstanceAttachments } from 'src/utils/attachmentsUtils';
import { returnUrlToArchive } from 'src/utils/urls/urlHelper';
import type { SummaryDataObject } from 'src/components/table/AltinnSummaryTable';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IAltinnOrgs, IAttachment, IParty } from 'src/types/shared';

export const returnInstanceMetaDataObject = (
  orgsData: IAltinnOrgs,
  langTools: IUseLanguage,
  instanceOwnerParty: IParty | undefined,
  instanceGuid: string,
  lastChangedDateTime: string,
  org: string,
) => {
  const obj: SummaryDataObject = {};

  obj[langTools.langAsString('receipt.date_sent')] = {
    value: lastChangedDateTime,
    hideFromVisualTesting: true,
  };

  let sender = '';
  if (instanceOwnerParty?.ssn) {
    sender = `${instanceOwnerParty.ssn}-${instanceOwnerParty.name}`;
  } else if (instanceOwnerParty?.orgNumber) {
    sender = `${instanceOwnerParty.orgNumber}-${instanceOwnerParty.name}`;
  }
  obj[langTools.langAsString('receipt.sender')] = {
    value: sender,
  };

  const receiver = getAppReceiver(orgsData, org, langTools);
  if (receiver) {
    obj[langTools.langAsString('receipt.receiver')] = {
      value: receiver,
    };
  } else {
    // This is only related to testing in Altinn Studio Dev
    obj[langTools.langAsString('receipt.receiver')] = {
      value: 'Error: Receiver org not found',
    };
  }

  obj[langTools.langAsString('receipt.ref_num')] = {
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

  const receiptLayoutName = useAppSelector((state) => state.formLayout.uiConfig.receiptLayoutName);
  const allOrgs = useAppSelector((state) => state.organisationMetaData.allOrgs);
  const applicationMetadata = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  const instance = useAppSelector((state) => state.instanceData.instance);
  const parties = useAppSelector((state) => state.party.parties);
  const layouts = useAppSelector((state) => Object.keys(state.formLayout.layouts || {}));
  const langTools = useLanguage();
  const { lang } = langTools;

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
    if (allOrgs != null && instance && instance.org && allOrgs && parties && instanceGuid) {
      const instanceOwnerParty = parties.find(
        (party: IParty) => party.partyId.toString() === instance.instanceOwner.partyId,
      );

      const obj = returnInstanceMetaDataObject(
        allOrgs,
        langTools,
        instanceOwnerParty,
        instanceGuid,
        lastChangedDateTime,
        instance.org,
      );
      setInstanceMetaObject(obj);
    }
  }, [allOrgs, parties, instance, lastChangedDateTime, instanceGuid, langTools]);

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
      parties ? (
        <>
          {!applicationMetadata.autoDeleteOnProcessEnd &&
            (receiptLayoutName && layouts.includes(receiptLayoutName) ? (
              <CustomReceipt />
            ) : (
              <ReceiptComponent
                attachmentGroupings={getAttachmentGroupings(attachments, applicationMetadata, langTools)}
                body={lang('receipt.body')}
                collapsibleTitle={lang('receipt.attachments')}
                instanceMetaDataObject={instanceMetaObject}
                subtitle={lang('receipt.subtitle')}
                subtitleurl={returnUrlToArchive(origin) || undefined}
                title={lang('receipt.title')}
                titleSubmitted={lang('receipt.title_submitted')}
                pdf={pdf || undefined}
              />
            ))}
          {applicationMetadata.autoDeleteOnProcessEnd && (
            <ReceiptComponentSimple
              body={lang('receipt.body_simple')}
              title={lang('receipt.title')}
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
