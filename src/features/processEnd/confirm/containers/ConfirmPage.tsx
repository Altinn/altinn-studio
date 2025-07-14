import React from 'react';
import { Helmet } from 'react-helmet-async';

import { Button } from 'src/app-components/Button/Button';
import { ReceiptComponent } from 'src/components/organisms/AltinnReceipt';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppOwner } from 'src/core/texts/appTexts';
import { useProcessNext } from 'src/features/instance/useProcessNext';
import { useIsAuthorized } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { returnConfirmSummaryObject } from 'src/features/processEnd/confirm/helpers/returnConfirmSummaryObject';
import {
  filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes,
  getAttachmentsWithDataType,
  getRefAsPdfAttachments,
  toDisplayAttachments,
} from 'src/utils/attachmentsUtils';
import { getPageTitle } from 'src/utils/getPageTitle';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IInstance, IParty } from 'src/types/shared';

export interface IConfirmPageProps {
  instance: IInstance | undefined;
  instanceOwnerParty?: IParty;
  appName: string;
  applicationMetadata: ApplicationMetadata | null;
}

export const ConfirmPage = ({ instance, instanceOwnerParty, appName, applicationMetadata }: IConfirmPageProps) => {
  const langTools = useLanguage();
  const appOwner = useAppOwner();

  const attachmentWithDataType = getAttachmentsWithDataType({
    attachments: instance?.data ?? [],
    appMetadataDataTypes: applicationMetadata?.dataTypes ?? [],
  });
  const relevantAttachments = filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes(attachmentWithDataType);
  const displayAttachments = toDisplayAttachments(relevantAttachments);

  const getInstanceMetaObject = () => {
    if (instance?.org && applicationMetadata) {
      return returnConfirmSummaryObject({
        instanceOwnerParty,
        langTools,
      });
    }
    return {};
  };

  return (
    <>
      <Helmet>
        <title>{`${getPageTitle(appName, langTools.langAsString('confirm.title'), appOwner)}`}</title>
      </Helmet>
      <ReceiptComponent
        attachments={displayAttachments}
        body={
          appName && (
            <Lang
              id='confirm.body'
              params={[appName]}
            />
          )
        }
        collapsibleTitle={<Lang id='confirm.attachments' />}
        hideCollapsibleCount={true}
        instanceMetaDataObject={getInstanceMetaObject()}
        title={<Lang id='confirm.title' />}
        titleSubmitted={<Lang id='confirm.answers' />}
        pdf={toDisplayAttachments(getRefAsPdfAttachments(attachmentWithDataType))}
      />
      <ConfirmButton />
      <ReadyForPrint type='load' />
    </>
  );
};

const ConfirmButton = () => {
  const canConfirm = useIsAuthorized()('confirm');
  const { mutateAsync: processConfirm, isPending: isConfirming } = useProcessNext({ action: 'confirm' });

  return (
    <div style={{ marginTop: 'var(--button-margin-top)' }}>
      <Button
        id='confirm-button'
        onClick={() => processConfirm()}
        disabled={!canConfirm}
        isLoading={isConfirming}
        color='success'
      >
        <Lang id='confirm.button_text' />
      </Button>
    </div>
  );
};
