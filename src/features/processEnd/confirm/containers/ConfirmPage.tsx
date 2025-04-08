import React from 'react';
import { Helmet } from 'react-helmet-async';

import { Button } from 'src/app-components/Button/Button';
import { ReceiptComponent } from 'src/components/organisms/AltinnReceipt';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useIsProcessing } from 'src/core/contexts/processingContext';
import { useAppOwner } from 'src/core/texts/appTexts';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useProcessNext } from 'src/features/instance/useProcessNext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { returnConfirmSummaryObject } from 'src/features/processEnd/confirm/helpers/returnConfirmSummaryObject';
import {
  filterDisplayAttachments,
  filterDisplayPdfAttachments,
  getAttachmentGroupings,
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

  const getInstanceMetaObject = () => {
    if (instance?.org && applicationMetadata) {
      return returnConfirmSummaryObject({
        instanceOwnerParty,
        langTools,
      });
    }
    return {};
  };

  const getAttachments = () => {
    if (instance?.data && applicationMetadata) {
      const appLogicDataTypes = applicationMetadata.dataTypes.filter((dataType) => !!dataType.appLogic);

      return filterDisplayAttachments(
        instance.data,
        appLogicDataTypes.map((type) => type.id),
      );
    }
  };

  return (
    <>
      <Helmet>
        <title>{`${getPageTitle(appName, langTools.langAsString('confirm.title'), appOwner)}`}</title>
      </Helmet>
      <ReceiptComponent
        attachmentGroupings={getAttachmentGroupings(getAttachments(), applicationMetadata, langTools)}
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
        pdf={filterDisplayPdfAttachments(instance?.data ?? [])}
      />
      <ConfirmButton />
      <ReadyForPrint type='load' />
    </>
  );
};

const ConfirmButton = () => {
  const { actions } = useLaxProcessData()?.currentTask || {};
  const processNext = useProcessNext();
  const { performProcess, isAnyProcessing, isThisProcessing } = useIsProcessing();

  const disabled = !actions?.confirm || isAnyProcessing;

  return (
    <div style={{ marginTop: 'var(--button-margin-top)' }}>
      <Button
        id='confirm-button'
        isLoading={isThisProcessing}
        onClick={() => performProcess(() => processNext({ action: 'confirm' }))}
        disabled={disabled}
        color='success'
      >
        <Lang id='confirm.button_text' />
      </Button>
    </div>
  );
};
