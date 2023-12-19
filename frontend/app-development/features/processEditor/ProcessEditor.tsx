import { ProcessEditor as ProcessEditorImpl } from '@altinn/process-editor';
import { useAppMetadataMutation, useBpmnMutation } from 'app-development/hooks/mutations';
import { useBpmnQuery } from 'app-development/hooks/queries/useBpmnQuery';
import React from 'react';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { toast } from 'react-toastify';
import { useAppLibVersionQuery, useAppMetadataQuery } from 'app-development/hooks/queries';
import { Alert, ErrorMessage, Paragraph, Spinner } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

export const ProcessEditor = () => {
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();
  const { data: bpmnXml, isError: hasBpmnQueryError } = useBpmnQuery(org, app);

  const {
    status: appLibStatus,
    data: appLibData,
    error: appLibError,
  } = useAppLibVersionQuery(org, app);
  const {
    status: applicationMetadataStatus,
    data: applicationMetadataData,
    error: applicationMetadataError,
  } = useAppMetadataQuery(org, app);

  const bpmnMutation = useBpmnMutation(org, app);
  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const updateApplicationMetadata = (applicationMetadata: ApplicationMetadata) => {
    updateAppMetadataMutation(applicationMetadata);
  };

  const saveBpmnXml = async (xml: string): Promise<void> => {
    await bpmnMutation.mutateAsync(
      { bpmnXml: xml },
      {
        onSuccess: () => {
          toast.success(t('process_editor.saved_successfully'));
        },
      },
    );
  };

  switch (mergeQueryStatuses(appLibStatus, applicationMetadataStatus)) {
    case 'pending':
      return <Spinner title={t('process_editor.loading')} />;
    case 'error':
      <Alert severity='danger'>
        <Paragraph>{t('general.fetch_error_message')}</Paragraph>
        <Paragraph>{t('general.error_message_with_colon')}</Paragraph>
        {appLibError && <ErrorMessage>{appLibError.message}</ErrorMessage>}
        {applicationMetadataError && (
          <ErrorMessage>{applicationMetadataError.message}</ErrorMessage>
        )}
      </Alert>;
    case 'success':
      return (
        <ProcessEditorImpl
          bpmnXml={hasBpmnQueryError ? null : bpmnXml}
          onSave={saveBpmnXml}
          appLibVersion={appLibData.version}
          applicationMetadata={applicationMetadataData}
          updateApplicationMetadata={updateApplicationMetadata}
        />
      );
  }
};
