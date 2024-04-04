import React from 'react';
import { ProcessEditor as ProcessEditorImpl } from '@altinn/process-editor';
import { useBpmnMutation } from 'app-development/hooks/mutations';
import { useBpmnQuery } from 'app-development/hooks/queries/useBpmnQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { toast } from 'react-toastify';
import { Spinner } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { processEditorWebSocketHub } from 'app-shared/api/paths';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { useWebSocket } from 'app-shared/hooks/useWebSocket';
import { type SyncSuccess, type SyncError, SyncUtils } from './syncUtils';
import { useUpdateLayoutSetMutation } from '../../hooks/mutations/useUpdateLayoutSetMutation';
import { useAddLayoutSetMutation } from '../../hooks/mutations/useAddLayoutSetMutation';
import { type MetaDataForm } from '@altinn/process-editor/src/contexts/BpmnConfigPanelContext';
import { useCustomReceiptLayoutSetName } from 'app-shared/hooks/useCustomReceiptLayoutSetName';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';

export const ProcessEditor = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioUrlParams();
  const { data: bpmnXml, isError: hasBpmnQueryError } = useBpmnQuery(org, app);
  const { data: appLibData, isLoading: appLibDataLoading } = useAppVersionQuery(org, app);
  const bpmnMutation = useBpmnMutation(org, app);
  const { mutate: mutateLayoutSet } = useUpdateLayoutSetMutation(org, app);
  const { mutate: addLayoutSet } = useAddLayoutSetMutation(org, app);
  const existingCustomReceiptName: string | undefined = useCustomReceiptLayoutSetName(org, app);
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const { onWSMessageReceived } = useWebSocket({
    webSocketUrl: processEditorWebSocketHub(),
    webSocketConnector: WSConnector,
  });

  onWSMessageReceived<SyncError | SyncSuccess>((message): void => {
    const isErrorMessage = 'errorCode' in message;
    if (isErrorMessage) {
      toast.error(t(SyncUtils.getSyncErrorMessage(message)));
      return;
    }

    const isSuccessMessage = 'source' in message;
    if (isSuccessMessage) {
      // Here we can handle the SyncSuccess message or invalidate the query cache
      console.log('SyncSuccess received');
    }
  });

  const saveBpmnXml = async (xml: string, metaData: MetaDataForm): Promise<void> => {
    const formData = new FormData();
    formData.append('content', new Blob([xml]), 'process.bpmn');
    formData.append('metadata', JSON.stringify(metaData));

    bpmnMutation.mutate(
      { form: formData },
      {
        onSuccess: () => {
          toast.success(t('process_editor.saved_successfully'));
        },
      },
    );
  };

  if (appLibDataLoading) {
    return <Spinner title={t('process_editor.loading')} />;
  }

  // TODO: Handle error will be handled better after issue #10735 is resolved
  return (
    <ProcessEditorImpl
      layoutSets={layoutSets}
      existingCustomReceiptLayoutSetName={existingCustomReceiptName}
      addLayoutSet={addLayoutSet}
      mutateLayoutSet={mutateLayoutSet}
      appLibVersion={appLibData.backendVersion}
      bpmnXml={hasBpmnQueryError ? null : bpmnXml}
      onSave={saveBpmnXml}
    />
  );
};
