import React, { useMemo } from 'react';
import { Outlet } from 'react-router-dom';

import { formatDate } from 'date-fns';

import { PrettyDateAndTime } from 'src/app-components/Datepicker/utils/dateHelpers';
import { AltinnContentIconReceipt } from 'src/components/atoms/AltinnContentIconReceipt';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { ReceiptComponent } from 'src/components/organisms/AltinnReceipt';
import { ReceiptComponentSimple } from 'src/components/organisms/AltinnReceiptSimple';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppName, useAppOwner, useAppReceiver } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useCurrentDataModelGuid } from 'src/features/datamodel/useBindingSchema';
import { FormProvider } from 'src/features/form/FormContext';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useLaxInstanceAllDataElements, useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useInstanceOwnerParty } from 'src/features/party/PartiesProvider';
import { getInstanceSender } from 'src/features/processEnd/confirm/helpers/returnConfirmSummaryObject';
import { useNavigationParam } from 'src/hooks/navigation';
import { TaskKeys } from 'src/hooks/useNavigatePage';
import { ProcessTaskType } from 'src/types';
import {
  filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes,
  getAttachmentsWithDataType,
  getRefAsPdfAttachments,
  toDisplayAttachments,
} from 'src/utils/attachmentsUtils';
import { behavesLikeDataTask } from 'src/utils/formLayout';
import { getPageTitle } from 'src/utils/getPageTitle';
import { returnUrlToArchive } from 'src/utils/urls/urlHelper';
import type { SummaryDataObject } from 'src/components/table/AltinnSummaryTable';
import type { IUseLanguage } from 'src/features/language/useLanguage';

interface ReturnInstanceMetaDataObjectProps {
  langTools: IUseLanguage;
  sender: string;
  instanceGuid: string;
  lastChangedDateTime: string;
  receiver: string | undefined;
}

export const getSummaryDataObject = ({
  langTools,
  sender,
  instanceGuid,
  lastChangedDateTime,
  receiver,
}: ReturnInstanceMetaDataObjectProps) => {
  const obj: SummaryDataObject = {};
  obj[langTools.langAsString('receipt.date_sent')] = {
    value: lastChangedDateTime,
    hideFromVisualTesting: true,
  };

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

export function DefaultReceipt() {
  return (
    <PresentationComponent
      type={ProcessTaskType.Archived}
      showNavigation={false}
    >
      <ReceiptContainer />
    </PresentationComponent>
  );
}

export function CustomReceipt() {
  const layoutSets = useLayoutSets();
  const dataModelGuid = useCurrentDataModelGuid();
  const hasCustomReceipt = behavesLikeDataTask(TaskKeys.CustomReceipt, layoutSets);
  const customReceiptDataModelNotFound = hasCustomReceipt && !dataModelGuid;

  if (customReceiptDataModelNotFound) {
    window.logWarnOnce(
      'You specified a custom receipt, but the data model is missing. Falling back to default receipt.',
    );
    return <ReceiptContainer />;
  }

  return (
    <FormProvider>
      <Outlet />
    </FormProvider>
  );
}

export const ReceiptContainer = () => {
  const applicationMetadata = useApplicationMetadata();
  const lastChanged = useLaxInstanceData((i) => i.lastChanged);
  const instanceOrg = useLaxInstanceData((i) => i.org);
  const instanceOwner = useLaxInstanceData((i) => i.instanceOwner);
  const dataElements = useLaxInstanceAllDataElements();
  const langTools = useLanguage();
  const receiver = useAppReceiver();
  const instanceOwnerParty = useInstanceOwnerParty();

  const instanceGuid = useNavigationParam('instanceGuid');

  const appName = useAppName();
  const appOwner = useAppOwner();
  const { langAsString } = useLanguage();
  const lastChangedDateTime = useMemo(() => {
    if (lastChanged) {
      return formatDate(lastChanged, PrettyDateAndTime);
    }
    return undefined;
  }, [lastChanged]);

  const attachmentWithDataType = getAttachmentsWithDataType({
    attachments: dataElements,
    appMetadataDataTypes: applicationMetadata?.dataTypes ?? [],
  });

  const displayAttachments = dataElements.length
    ? toDisplayAttachments(filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes(attachmentWithDataType))
    : undefined;

  const pdfDisplayAttachments = dataElements.length
    ? toDisplayAttachments(getRefAsPdfAttachments(attachmentWithDataType))
    : undefined;

  const instanceMetaObject = useMemo(() => {
    if (instanceOrg && instanceOwner && instanceGuid && lastChangedDateTime) {
      const sender = getInstanceSender(instanceOwnerParty ?? undefined);
      return getSummaryDataObject({
        langTools,
        sender,
        instanceGuid,
        lastChangedDateTime,
        receiver,
      });
    }

    return undefined;
  }, [instanceOrg, instanceGuid, lastChangedDateTime, langTools, receiver, instanceOwner, instanceOwnerParty]);

  function getMissingRequirement() {
    if (!displayAttachments) {
      return 'attachments';
    }
    if (!instanceMetaObject) {
      return 'instanceMetaObject';
    }
    if (!lastChangedDateTime) {
      return 'lastChangedDateTime';
    }
    if (!instanceOwnerParty) {
      return 'instanceOwnerParty';
    }
    return undefined;
  }

  const requirementMissing = getMissingRequirement();

  if (requirementMissing || !(instanceMetaObject && pdfDisplayAttachments)) {
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
      <title>{`${getPageTitle(appName, langAsString('receipt.title'), appOwner)}`}</title>

      {!applicationMetadata.autoDeleteOnProcessEnd && (
        <ReceiptComponent
          attachments={displayAttachments}
          body={<Lang id='receipt.body' />}
          collapsibleTitle={<Lang id='receipt.attachments' />}
          instanceMetaDataObject={instanceMetaObject}
          subtitle={<Lang id='receipt.subtitle' />}
          subtitleurl={returnUrlToArchive(window.location.host)}
          title={<Lang id='receipt.title' />}
          titleSubmitted={<Lang id='receipt.title_submitted' />}
          pdf={pdfDisplayAttachments}
        />
      )}
      {applicationMetadata.autoDeleteOnProcessEnd && (
        <ReceiptComponentSimple
          body={<Lang id='receipt.body_simple' />}
          title={<Lang id='receipt.title' />}
        />
      )}
      <ReadyForPrint type='load' />
    </div>
  );
};
