import React, { type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  StudioPageError,
  StudioRecommendedNextActionContextProvider,
  StudioPageSpinner,
} from '@studio/components';
import { Canvas } from './components/Canvas';
import { BpmnContextProvider } from './contexts/BpmnContext';
import { ConfigPanel } from './components/ConfigPanel';

import classes from './ProcessEditor.module.css';
import { BpmnApiContextProvider } from './contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from './contexts/BpmnConfigPanelContext';
import type { MetadataForm } from 'app-shared/types/BpmnMetadataForm';
import type { OnProcessTaskEvent } from './types/OnProcessTask';
import { OnProcessTaskAddHandler } from './handlers/OnProcessTaskAddHandler';
import { OnProcessTaskRemoveHandler } from './handlers/OnProcessTaskRemoveHandler';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useBpmnQuery } from 'app-shared/hooks/queries/useBpmnQuery';
import { useBpmnMutation } from 'app-shared/hooks/mutations/useBpmnMutation';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useCustomReceiptLayoutSetName } from 'app-shared/hooks/useCustomReceiptLayoutSetName';
import { useAppPolicyQuery } from 'app-development/hooks/queries';
import { useAppPolicyMutation } from 'app-development/hooks/mutations';
import { useAddLayoutSetMutation } from 'app-development/hooks/mutations/useAddLayoutSetMutation';
import { useDeleteLayoutSetMutation } from 'app-development/hooks/mutations/useDeleteLayoutSetMutation';
import { useUpdateLayoutSetIdMutation } from 'app-development/hooks/mutations/useUpdateLayoutSetIdMutation';
import { useUpdateProcessDataTypesMutation } from 'app-development/hooks/mutations/useUpdateProcessDataTypesMutation';
import { useAddDataTypeToAppMetadata } from 'app-development/hooks/mutations/useAddDataTypeToAppMetadata';
import { useDeleteDataTypeFromAppMetadata } from 'app-development/hooks/mutations/useDeleteDataTypeFromAppMetadata';

export const ProcessEditor = (): JSX.Element => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  const { data: currentPolicy, isPending: isPendingCurrentPolicy } = useAppPolicyQuery(org, app);
  const { mutate: mutateApplicationPolicy } = useAppPolicyMutation(org, app);
  const { data: bpmnXml, isError: hasBpmnQueryError } = useBpmnQuery(org, app);
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
  const existingCustomReceiptLayoutSetId: string | undefined = useCustomReceiptLayoutSetName(
    org,
    app,
  );

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

  const saveBpmn = (xml: string, metadata?: MetadataForm): void => {
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
    new OnProcessTaskAddHandler(
      org,
      app,
      currentPolicy,
      addLayoutSet,
      mutateApplicationPolicy,
      addDataTypeToAppMetadata,
    ).handleOnProcessTaskAdd(taskMetadata);
  };

  const onProcessTaskRemove = (taskMetadata: OnProcessTaskEvent): void => {
    new OnProcessTaskRemoveHandler(
      org,
      app,
      currentPolicy,
      layoutSets,
      mutateApplicationPolicy,
      deleteDataTypeFromAppMetadata,
      deleteLayoutSet,
    ).handleOnProcessTaskRemove(taskMetadata);
  };

  if (appMetadataPending) {
    return <StudioPageSpinner spinnerTitle={t('process_editor.loading')} />;
  }

  if (hasBpmnQueryError || bpmnXml === null) {
    return <NoBpmnFoundAlert />;
  }

  if (bpmnXml === undefined) {
    return <StudioPageSpinner spinnerTitle={t('process_editor.loading')} showSpinnerTitle />;
  }

  return (
    <BpmnContextProvider bpmnXml={bpmnXml}>
      <BpmnApiContextProvider
        availableDataTypeIds={appMetadata?.dataTypes?.map((dataType) => dataType.id)}
        availableDataModelIds={availableDataModelIds}
        allDataModelIds={allDataModelIds}
        layoutSets={layoutSets}
        pendingApiOperations={pendingApiOperations}
        existingCustomReceiptLayoutSetId={existingCustomReceiptLayoutSetId}
        addLayoutSet={addLayoutSet}
        deleteLayoutSet={deleteLayoutSet}
        mutateLayoutSetId={mutateLayoutSetId}
        mutateDataTypes={mutateDataTypes}
        saveBpmn={saveBpmn}
        onProcessTaskAdd={onProcessTaskAdd}
        onProcessTaskRemove={onProcessTaskRemove}
      >
        <BpmnConfigPanelFormContextProvider>
          <StudioRecommendedNextActionContextProvider>
            <BpmnCanvas />
          </StudioRecommendedNextActionContextProvider>
        </BpmnConfigPanelFormContextProvider>
      </BpmnApiContextProvider>
    </BpmnContextProvider>
  );
};

const BpmnCanvas = (): React.ReactElement => {
  return (
    <div className={classes.container}>
      <Canvas />
      <div className={classes.container}>
        <ConfigPanel />
      </div>
    </div>
  );
};

const NoBpmnFoundAlert = (): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioPageError
      title={t('process_editor.fetch_bpmn_error_title')}
      message={t('process_editor.fetch_bpmn_error_message')}
    />
  );
};
