import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Route, Routes } from 'react-router-dom';

import { formatDate } from 'date-fns';

import { AltinnContentIconReceipt } from 'src/components/atoms/AltinnContentIconReceipt';
import { Form } from 'src/components/form/Form';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { ReceiptComponent } from 'src/components/organisms/AltinnReceipt';
import { ReceiptComponentSimple } from 'src/components/organisms/AltinnReceiptSimple';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { ComponentRouting } from 'src/components/wrappers/ProcessWrapper';
import { useAppName, useAppOwner, useAppReceiver } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useCurrentDataModelGuid } from 'src/features/datamodel/useBindingSchema';
import { FormProvider } from 'src/features/form/FormContext';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useLaxInstanceAllDataElements, useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useParties } from 'src/features/party/PartiesProvider';
import { PDFWrapper } from 'src/features/pdf/PDFWrapper';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { TaskKeys } from 'src/hooks/useNavigatePage';
import { ProcessTaskType } from 'src/types';
import {
  filterDisplayAttachments,
  filterDisplayPdfAttachments,
  getAttachmentGroupings,
} from 'src/utils/attachmentsUtils';
import { behavesLikeDataTask } from 'src/utils/formLayout';
import { getPageTitle } from 'src/utils/getPageTitle';
import { getInstanceOwnerParty } from 'src/utils/party';
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

export function DefaultReceipt() {
  return (
    <PresentationComponent type={ProcessTaskType.Archived}>
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
    return (
      <PresentationComponent type={ProcessTaskType.Archived}>
        <ReceiptContainer />
      </PresentationComponent>
    );
  }

  return (
    <FormProvider>
      <Routes>
        <Route
          path=':pageKey/:componentId/*'
          element={
            <PresentationComponent type={ProcessTaskType.Archived}>
              <ComponentRouting />
            </PresentationComponent>
          }
        />
        <Route
          path='*'
          element={
            <PDFWrapper>
              <PresentationComponent type={ProcessTaskType.Archived}>
                <Form />
              </PresentationComponent>
            </PDFWrapper>
          }
        />
      </Routes>
    </FormProvider>
  );
}

export const ReceiptContainer = () => {
  const applicationMetadata = useApplicationMetadata();
  const lastChanged = useLaxInstanceData((i) => i.lastChanged);
  const instanceOrg = useLaxInstanceData((i) => i.org);
  const instanceOwner = useLaxInstanceData((i) => i.instanceOwner);
  const dataElements = useLaxInstanceAllDataElements();
  const parties = useParties();
  const langTools = useLanguage();
  const receiver = useAppReceiver();

  const origin = window.location.origin;

  const instanceGuid = useNavigationParam('instanceGuid');

  const appName = useAppName();
  const appOwner = useAppOwner();
  const { langAsString } = useLanguage();
  const lastChangedDateTime = useMemo(() => {
    if (lastChanged) {
      return formatDate(lastChanged, 'dd.MM.yyyy / HH:mm');
    }
    return undefined;
  }, [lastChanged]);

  const attachments = useMemo(() => {
    if (dataElements.length) {
      const defaultElementIds = applicationMetadata.dataTypes
        .filter((dataType) => !!dataType.appLogic)
        .map((type) => type.id);

      const attachmentsResult = filterDisplayAttachments(dataElements, defaultElementIds);
      return attachmentsResult || [];
    }
    return undefined;
  }, [applicationMetadata, dataElements]);

  const pdf = useMemo(() => {
    if (dataElements.length) {
      return filterDisplayPdfAttachments(dataElements);
    }
    return undefined;
  }, [dataElements]);

  const instanceMetaObject = useMemo(() => {
    if (instanceOrg && instanceOwner && parties && instanceGuid && lastChangedDateTime) {
      const instanceOwnerParty = getInstanceOwnerParty(instanceOwner, parties);

      return getSummaryDataObject({
        langTools,
        instanceOwnerParty,
        instanceGuid,
        lastChangedDateTime,
        receiver,
      });
    }

    return undefined;
  }, [instanceOrg, parties, instanceGuid, lastChangedDateTime, langTools, receiver, instanceOwner]);

  const requirementMissing = !attachments
    ? 'attachments'
    : !instanceMetaObject
      ? 'instanceMetaObject'
      : !lastChangedDateTime
        ? 'lastChangedDateTime'
        : !instanceOwner
          ? 'instance'
          : !parties
            ? 'parties'
            : undefined;

  if (requirementMissing || !(instanceOwner && parties && instanceMetaObject && pdf)) {
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
      <Helmet>
        <title>{`${getPageTitle(appName, langAsString('receipt.title'), appOwner)}`}</title>
      </Helmet>

      {!applicationMetadata.autoDeleteOnProcessEnd && (
        <ReceiptComponent
          attachmentGroupings={getAttachmentGroupings(attachments, applicationMetadata, langTools)}
          body={<Lang id='receipt.body' />}
          collapsibleTitle={<Lang id='receipt.attachments' />}
          instanceMetaDataObject={instanceMetaObject}
          subtitle={<Lang id='receipt.subtitle' />}
          subtitleurl={returnUrlToArchive(origin) || undefined}
          title={<Lang id='receipt.title' />}
          titleSubmitted={<Lang id='receipt.title_submitted' />}
          pdf={pdf}
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
