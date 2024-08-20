import React from 'react';
import { ProcessEditor as ProcessEditorImpl } from '@altinn/process-editor';
import { useAppPolicyMutation } from '../../hooks/mutations';
import { useBpmnMutation } from 'app-shared/hooks/mutations/useBpmnMutation';
import { useBpmnQuery } from 'app-shared/hooks/queries/useBpmnQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { toast } from 'react-toastify';
import { StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { useUpdateLayoutSetIdMutation } from '../../hooks/mutations/useUpdateLayoutSetIdMutation';
import { useAddLayoutSetMutation } from '../../hooks/mutations/useAddLayoutSetMutation';
import { useCustomReceiptLayoutSetName } from 'app-shared/hooks/useCustomReceiptLayoutSetName';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useDeleteLayoutSetMutation } from '../../hooks/mutations/useDeleteLayoutSetMutation';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useUpdateProcessDataTypesMutation } from '../../hooks/mutations/useUpdateProcessDataTypesMutation';
import type { MetadataForm } from 'app-shared/types/BpmnMetadataForm';
import { useAddDataTypeToAppMetadata } from '../../hooks/mutations/useAddDataTypeToAppMetadata';
import { useDeleteDataTypeFromAppMetadata } from '../../hooks/mutations/useDeleteDataTypeFromAppMetadata';
import { useSettingsModalContext } from '../../contexts/SettingsModalContext';
import { useAppMetadataQuery, useAppPolicyQuery } from '../../hooks/queries';
import type { OnProcessTaskEvent } from '@altinn/process-editor/types/OnProcessTask';
import { OnProcessTaskAddHandler } from './handlers/OnProcessTaskAddHandler';
import { OnProcessTaskRemoveHandler } from './handlers/OnProcessTaskRemoveHandler';

export const ProcessEditor = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: currentPolicy, isPending: isPendingCurrentPolicy } = useAppPolicyQuery(org, app);
  const { mutate: mutateApplicationPolicy } = useAppPolicyMutation(org, app);
  const { setSettingsModalOpen, setSettingsModalSelectedTab } = useSettingsModalContext();
  const {
    data: bpmnXml,
    isError: hasBpmnQueryError,
    isPending: isBpmnPending,
  } = useBpmnQuery(org, app);
  const { data: appLibData, isLoading: appLibDataLoading } = useAppVersionQuery(org, app);
  const { mutate: mutateBpmn, isPending: mutateBpmnPending } = useBpmnMutation(org, app);
  const { mutate: mutateLayoutSetId, isPending: mutateLayoutSetIdPending } =
    useUpdateLayoutSetIdMutation(org, app);
  const { mutate: addLayoutSet, isPending: addLayoutSetPending } = useAddLayoutSetMutation(
    org,
    app,
  );
  const { mutate: deleteLayoutSet, isPending: deleteLayoutSetPending } = useDeleteLayoutSetMutation(
    org,
    app,
  );
  const { mutate: mutateDataTypes, isPending: updateDataTypePending } =
    useUpdateProcessDataTypesMutation(org, app);

  const existingCustomReceiptId: string | undefined = useCustomReceiptLayoutSetName(org, app);

  const { mutate: addDataTypeToAppMetadata } = useAddDataTypeToAppMetadata(org, app);
  const { mutate: deleteDataTypeFromAppMetadata } = useDeleteDataTypeFromAppMetadata(org, app);

  const { data: appMetadata, isPending: appMetadataPending } = useAppMetadataQuery(org, app);
  const { data: availableDataModelIds, isPending: availableDataModelIdsPending } =
    useAppMetadataModelIdsQuery(org, app);
  const { data: allDataModelIds, isPending: allDataModelIdsPending } = useAppMetadataModelIdsQuery(
    org,
    app,
    false,
  );
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const pendingApiOperations: boolean =
    mutateBpmnPending ||
    mutateLayoutSetIdPending ||
    addLayoutSetPending ||
    deleteLayoutSetPending ||
    updateDataTypePending ||
    appMetadataPending ||
    availableDataModelIdsPending ||
    allDataModelIdsPending ||
    isPendingCurrentPolicy;

  const saveBpmnXml = async (xml: string, metadata?: MetadataForm): Promise<void> => {
    const formData = new FormData();
    formData.append('content', new Blob([xml]));
    formData.append('metadata', JSON.stringify(metadata));

    mutateBpmn(
      { form: formData },
      {
        onError: () => {
          toast.error(t('process_editor.save_bpmn_xml_error'));
        },
      },
    );
  };

  const onProcessTaskAdd = (taskMetadata: OnProcessTaskEvent): void => {
    const onProcessTaskAddHandler = new OnProcessTaskAddHandler(
      org,
      app,
      currentPolicy,
      addLayoutSet,
      mutateApplicationPolicy,
      addDataTypeToAppMetadata,
    );
    onProcessTaskAddHandler.handleOnProcessTaskAdd(taskMetadata);
  };

  const onProcessTaskRemove = (taskMetadata: OnProcessTaskEvent): void => {
    const onProcessTaskRemoveHandler = new OnProcessTaskRemoveHandler(
      org,
      app,
      currentPolicy,
      layoutSets,
      mutateApplicationPolicy,
      deleteDataTypeFromAppMetadata,
      deleteLayoutSet,
    );
    onProcessTaskRemoveHandler.handleOnProcessTaskRemove(taskMetadata);
  };

  if (isBpmnPending || appLibDataLoading || appMetadataPending) {
    return <StudioPageSpinner spinnerTitle={t('process_editor.loading')} showSpinnerTitle />;
  }

  // TODO: Handle error will be handled better after issue #10735 is resolved
  return (
    <ProcessEditorImpl
      availableDataTypeIds={appMetadata?.dataTypes?.map((dataType) => dataType.id)}
      availableDataModelIds={availableDataModelIds}
      allDataModelIds={allDataModelIds}
      layoutSets={layoutSets}
      pendingApiOperations={pendingApiOperations}
      existingCustomReceiptLayoutSetId={existingCustomReceiptId}
      addLayoutSet={addLayoutSet}
      deleteLayoutSet={deleteLayoutSet}
      mutateLayoutSetId={mutateLayoutSetId}
      appLibVersion={appLibData.backendVersion}
      bpmnXml={hasBpmnQueryError ? null : bpmnXml}
      mutateDataTypes={mutateDataTypes}
      saveBpmn={saveBpmnXml}
      openPolicyEditor={() => {
        setSettingsModalSelectedTab('policy');
        setSettingsModalOpen(true);
      }}
      onProcessTaskAdd={onProcessTaskAdd}
      onProcessTaskRemove={onProcessTaskRemove}
    />
  );
};
