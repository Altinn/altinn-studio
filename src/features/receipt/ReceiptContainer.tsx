import React, { useMemo } from 'react';

import moment from 'moment';

import { AltinnContentIconReceipt } from 'src/components/atoms/AltinnContentIconReceipt';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { ReceiptComponent } from 'src/components/organisms/AltinnReceipt';
import { ReceiptComponentSimple } from 'src/components/organisms/AltinnReceiptSimple';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppReceiver } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useParties } from 'src/features/party/PartiesProvider';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import {
  filterDisplayAttachments,
  filterDisplayPdfAttachments,
  getAttachmentGroupings,
} from 'src/utils/attachmentsUtils';
import { returnUrlToArchive } from 'src/utils/urls/urlHelper';
import type { SummaryDataObject } from 'src/components/table/AltinnSummaryTable';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IParty } from 'src/types/shared';

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
  const applicationMetadata = useApplicationMetadata();
  const instance = useLaxInstanceData();
  const parties = useParties();
  const langTools = useLanguage();
  const receiver = useAppReceiver();

  const origin = window.location.origin;

  const instanceGuid = useNavigationParam('instanceGuid');

  const lastChangedDateTime = useMemo(() => {
    if (instance && instance.data) {
      return moment(instance.lastChanged).format('DD.MM.YYYY / HH:mm');
    }
    return undefined;
  }, [instance]);

  const attachments = useMemo(() => {
    if (instance && instance.data) {
      const defaultElementIds = applicationMetadata.dataTypes
        .filter((dataType) => !!dataType.appLogic)
        .map((type) => type.id);

      const attachmentsResult = filterDisplayAttachments(instance.data, defaultElementIds);
      return attachmentsResult || [];
    }
    return undefined;
  }, [applicationMetadata, instance]);

  const pdf = useMemo(() => {
    if (instance && instance.data) {
      return filterDisplayPdfAttachments(instance.data);
    }
    return undefined;
  }, [instance]);

  const instanceMetaObject = useMemo(() => {
    if (instance && instance.org && parties && instanceGuid && lastChangedDateTime) {
      const instanceOwnerParty = parties.find(
        (party: IParty) => party.partyId.toString() === instance.instanceOwner.partyId,
      );

      return getSummaryDataObject({
        langTools,
        instanceOwnerParty,
        instanceGuid,
        lastChangedDateTime,
        receiver,
      });
    }

    return undefined;
  }, [instance, parties, instanceGuid, lastChangedDateTime, langTools, receiver]);

  const requirementMissing = !attachments
    ? 'attachments'
    : !instanceMetaObject
      ? 'instanceMetaObject'
      : !lastChangedDateTime
        ? 'lastChangedDateTime'
        : !instance
          ? 'instance'
          : !parties
            ? 'parties'
            : undefined;

  if (requirementMissing || !(instance && parties && instanceMetaObject && pdf)) {
    return (
      <AltinnContentLoader
        width={705}
        height={561}
        reason={`receipt-missing-${requirementMissing}`}
      >
        <AltinnContentIconReceipt />
      </AltinnContentLoader>
    );
  }

  return (
    <div id='ReceiptContainer'>
      {!applicationMetadata.autoDeleteOnProcessEnd && (
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
      )}
      {applicationMetadata.autoDeleteOnProcessEnd && (
        <ReceiptComponentSimple
          body={<Lang id={'receipt.body_simple'} />}
          title={<Lang id={'receipt.title'} />}
        />
      )}
      <ReadyForPrint />
    </div>
  );
};
