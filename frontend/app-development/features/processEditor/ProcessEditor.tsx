import React from 'react';
import { ProcessEditor as ProcessEditorImpl } from '@altinn/process-editor';
import { useBpmnMutation } from 'app-development/hooks/mutations';
import { useBpmnQuery } from 'app-development/hooks/queries/useBpmnQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { toast } from 'react-toastify';
import { StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { processEditorWebSocketHub } from 'app-shared/api/paths';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { useWebSocket } from 'app-shared/hooks/useWebSocket';
import { type SyncSuccess, type SyncError, SyncUtils } from './syncUtils';
import { useUpdateLayoutSetMutation } from '../../hooks/mutations/useUpdateLayoutSetMutation';
import { useAddLayoutSetMutation } from '../../hooks/mutations/useAddLayoutSetMutation';
import { useCustomReceiptLayoutSetName } from 'app-shared/hooks/useCustomReceiptLayoutSetName';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useDeleteLayoutSetMutation } from '../../hooks/mutations/useDeleteLayoutSetMutation';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useUpdateProcessDataTypeMutation } from '../../hooks/mutations/useUpdateProcessDataTypeMutation';
import type { MetaDataForm } from 'app-shared/types/BpmnMetaDataForm';
import { useAddDataTypeToAppMetadata } from '../../hooks/mutations/useAddDataTypeToAppMetadata';
import { useDeleteDataTypeFromAppMetadata } from '../../hooks/mutations/useDeleteDataTypeFromAppMetadata';

enum SyncClientsName {
  FileSyncSuccess = 'FileSyncSuccess',
  FileSyncError = 'FileSyncError',
}

export const ProcessEditor = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioUrlParams();
  const { data: bpmnXml, isError: hasBpmnQueryError } = useBpmnQuery(org, app);
  const { data: appLibData, isLoading: appLibDataLoading } = useAppVersionQuery(org, app);
  const { mutate: mutateBpmn, isPending: mutateBpmnPending } = useBpmnMutation(org, app);
  const { mutate: mutateLayoutSet, isPending: mutateLayoutSetPending } = useUpdateLayoutSetMutation(
    org,
    app,
  );
  const { mutate: addLayoutSet, isPending: addLayoutSetPending } = useAddLayoutSetMutation(
    org,
    app,
  );
  const { mutate: deleteLayoutSet, isPending: deleteLayoutSetPending } = useDeleteLayoutSetMutation(
    org,
    app,
  );
  const { mutate: mutateDataType, isPending: updateDataTypePending } =
    useUpdateProcessDataTypeMutation(org, app);

  const existingCustomReceiptId: string | undefined = useCustomReceiptLayoutSetName(org, app);

  const { mutate: addDataTypeToAppMetadata } = useAddDataTypeToAppMetadata(org, app);
  const { mutate: deleteDataTypeFromAppMetadata } = useDeleteDataTypeFromAppMetadata(org, app);

  const { data: availableDataModelIds, isPending: availableDataModelIdsPending } =
    useAppMetadataModelIdsQuery(org, app);
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const pendingApiOperations: boolean =
    mutateBpmnPending ||
    mutateLayoutSetPending ||
    addLayoutSetPending ||
    deleteLayoutSetPending ||
    updateDataTypePending ||
    availableDataModelIdsPending;

  const { onWSMessageReceived } = useWebSocket({
    webSocketUrl: processEditorWebSocketHub(),
    clientsName: [SyncClientsName.FileSyncSuccess, SyncClientsName.FileSyncError],
    webSocketConnector: WSConnector,
  });

  onWSMessageReceived<SyncError | SyncSuccess>((message): void => {
    const isErrorMessage = 'errorCode' in message;
    if (isErrorMessage) {
      toast.error(t(SyncUtils.getSyncErrorMessage(message)), { toastId: message.errorCode });
      return;
    }

    const isSuccessMessage = 'source' in message;
    if (isSuccessMessage) {
      // Here we can handle the SyncSuccess message or invalidate the query cache
      console.log('SyncSuccess received');
    }
  });

  const saveBpmnXml = async (xml: string, metaData?: MetaDataForm): Promise<void> => {
    const formData = new FormData();
    formData.append('content', new Blob([xml]), 'process.bpmn');
    formData.append('metadata', JSON.stringify(metaData));

    mutateBpmn(
      { form: formData },
      {
        onError: () => {
          toast.error(t('process_editor.save_bpmn_xml_error'));
        },
      },
    );
  };

  if (appLibDataLoading) {
    return <StudioPageSpinner spinnerTitle={t('process_editor.loading')} showSpinnerTitle />;
  }

  // TODO: Handle error will be handled better after issue #10735 is resolved
  return (
    <ProcessEditorImpl
      availableDataModelIds={availableDataModelIds}
      layoutSets={layoutSets}
      pendingApiOperations={pendingApiOperations}
      existingCustomReceiptLayoutSetId={existingCustomReceiptId}
      addLayoutSet={addLayoutSet}
      deleteLayoutSet={deleteLayoutSet}
      mutateLayoutSet={mutateLayoutSet}
      appLibVersion={appLibData.backendVersion}
      bpmnXml={hasBpmnQueryError ? null : bpmnXml}
      mutateDataType={mutateDataType}
      addDataTypeToAppMetadata={addDataTypeToAppMetadata}
      deleteDataTypeFromAppMetadata={deleteDataTypeFromAppMetadata}
      saveBpmn={saveBpmnXml}
    />
  );
};
