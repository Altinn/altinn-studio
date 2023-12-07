import React, { useEffect, useState } from 'react';

import moment from 'moment';

import { AltinnContentIconReceipt } from 'src/components/atoms/AltinnContentIconReceipt';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { ReceiptComponent } from 'src/components/organisms/AltinnReceipt';
import { ReceiptComponentSimple } from 'src/components/organisms/AltinnReceiptSimple';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppReceiver } from 'src/core/texts/appTexts';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useParties } from 'src/features/party/PartiesProvider';
import { CustomReceipt } from 'src/features/receipt/CustomReceipt';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useInstanceIdParams } from 'src/hooks/useInstanceIdParams';
import { layoutsSelector } from 'src/selectors/layout';
import {
  filterDisplayAttachments,
  filterDisplayPdfAttachments,
  getAttachmentGroupings,
} from 'src/utils/attachmentsUtils';
import { returnUrlToArchive } from 'src/utils/urls/urlHelper';
import type { SummaryDataObject } from 'src/components/table/AltinnSummaryTable';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IDisplayAttachment, IParty } from 'src/types/shared';

interface ReturnInstanceMetaDataObjectProps {
  langTools: IUseLanguage;
  instanceOwnerParty: IParty | undefined;
  instanceGuid: string;
  lastChangedDateTime: string;
  receiver: string | undefined;
}

export const getSummaryDataObject = ({
  langTools,
  instanceOwnerParty,
  instanceGuid,
  lastChangedDateTime,
  receiver,
}: ReturnInstanceMetaDataObjectProps) => {
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
  const [attachments, setAttachments] = useState<IDisplayAttachment[]>([]);
  const [pdf, setPdf] = useState<IDisplayAttachment[]>([]);
  const [lastChangedDateTime, setLastChangedDateTime] = useState('');
  const [instanceMetaObject, setInstanceMetaObject] = useState<SummaryDataObject>({});

  const receiptLayoutName = useAppSelector((state) => state.formLayout.uiConfig.receiptLayoutName);
  const allOrgs = useAppSelector((state) => state.organisationMetaData.allOrgs);
  const applicationMetadata = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  const instance = useLaxInstanceData();
  const parties = useParties();
  const layouts = useAppSelector(layoutsSelector);
  const langTools = useLanguage();
  const receiver = useAppReceiver();

  const origin = window.location.origin;

  const { instanceGuid } = useInstanceIdParams();

  useEffect(() => {
    if (allOrgs != null && instance && instance.org && allOrgs && parties && instanceGuid) {
      const instanceOwnerParty = parties.find(
        (party: IParty) => party.partyId.toString() === instance.instanceOwner.partyId,
      );

      const obj = getSummaryDataObject({
        langTools,
        instanceOwnerParty,
        instanceGuid,
        lastChangedDateTime,
        receiver,
      });
      setInstanceMetaObject(obj);
    }
  }, [allOrgs, parties, instance, lastChangedDateTime, instanceGuid, langTools, receiver]);

  useEffect(() => {
    if (instance && instance.data && applicationMetadata) {
      const defaultElementIds = applicationMetadata.dataTypes
        .filter((dataType) => !!dataType.appLogic)
        .map((type) => type.id);

      const attachmentsResult = filterDisplayAttachments(instance.data, defaultElementIds);
      setAttachments(attachmentsResult || []);
      setPdf(filterDisplayPdfAttachments(instance.data));
      setLastChangedDateTime(moment(instance.lastChanged).format('DD.MM.YYYY / HH:mm'));
    }
  }, [instance, applicationMetadata]);

  // React.useEffect(() => {
  //   if (!process?.ended) {
  //     navigateToPage(PageKeys.Confirmation);
  //   }
  // }, [process?.ended, navigateToPage]);

  const requirementMissing = !attachments
    ? 'attachments'
    : !applicationMetadata
      ? 'applicationMetadata'
      : !instanceMetaObject
        ? 'instanceMetaObject'
        : !lastChangedDateTime
          ? 'lastChangedDateTime'
          : !allOrgs
            ? 'allOrgs'
            : !instance
              ? 'instance'
              : !parties
                ? 'parties'
                : undefined;

  return (
    <div id='ReceiptContainer'>
      {!requirementMissing &&
      attachments &&
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
                body={<Lang id={'receipt.body'} />}
                collapsibleTitle={<Lang id={'receipt.attachments'} />}
                instanceMetaDataObject={instanceMetaObject}
                subtitle={<Lang id={'receipt.subtitle'} />}
                subtitleurl={returnUrlToArchive(origin) || undefined}
                title={<Lang id={'receipt.title'} />}
                titleSubmitted={<Lang id={'receipt.title_submitted'} />}
                pdf={pdf}
              />
            ))}
          {applicationMetadata.autoDeleteOnProcessEnd && (
            <ReceiptComponentSimple
              body={<Lang id={'receipt.body_simple'} />}
              title={<Lang id={'receipt.title'} />}
            />
          )}
          <ReadyForPrint />
        </>
      ) : (
        <AltinnContentLoader
          width={705}
          height={561}
          reason={`receipt-missing-${requirementMissing}`}
        >
          <AltinnContentIconReceipt />
        </AltinnContentLoader>
      )}
    </div>
  );
};
