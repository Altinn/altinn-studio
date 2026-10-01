import { useRef, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioPageError,
  StudioRecommendedNextActionContextProvider,
  StudioPageSpinner,
  StudioAlert,
  StudioButton,
  StudioParagraph,
} from '@studio/components';
import { Canvas } from './components/Canvas';
import { BpmnContextProvider } from './contexts/BpmnContext';
import { ConfigPanel } from './components/ConfigPanel';
import classes from './ProcessEditor.module.css';
import { BpmnApiContextProvider, type BpmnApiContextProps } from './contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from './contexts/BpmnConfigPanelContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useCustomReceiptLayoutSetName } from 'app-shared/hooks/useCustomReceiptLayoutSetName';
import type { ProcessState } from 'app-shared/types/api/ProcessState';
import { useProcessState } from './hooks/useProcessState';
import { useProcessOperations } from './hooks/useProcessOperations';
import type { ProcessSaveFailure } from './utils/ProcessChangeQueue';

export const ProcessEditor = (): JSX.Element => {
  const { org, app } = useStudioEnvironmentParams();
  return <ProcessEditorForApp key={`${org}/${app}`} org={org} app={app} />;
};

function ProcessEditorForApp({ org, app }: { org: string; app: string }): JSX.Element {
  const { t } = useTranslation();
  const { data: state, isError, isFetching, refetch } = useProcessState(org, app);
  // Background refetches must not replace the diagram or the version of its queued edits.
  const initialState = useRef<ProcessState>(undefined);
  if (!initialState.current && state && !isFetching) {
    initialState.current = state;
  }
  const { data: appMetadata, isPending: appMetadataPending } = useAppMetadataQuery(org, app);
  const { data: availableDataModelIds, isPending: availableDataModelIdsPending } =
    useAppMetadataModelIdsQuery(org, app);
  const { data: allDataModelIds, isPending: allDataModelIdsPending } = useAppMetadataModelIdsQuery(
    org,
    app,
    false,
  );
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const existingCustomReceiptLayoutSetId = useCustomReceiptLayoutSetName(org, app);

  if (!initialState.current && isError) {
    return (
      <StudioPageError
        title={t('process_editor.fetch_bpmn_error_title')}
        message={t('process_editor.fetch_bpmn_error_message')}
      />
    );
  }
  if (appMetadataPending || !initialState.current) {
    return <StudioPageSpinner spinnerTitle={t('process_editor.loading')} />;
  }

  const load = async (): Promise<ProcessState> => {
    const { data } = await refetch({ throwOnError: true });
    return data;
  };

  return (
    <BpmnContextProvider bpmnXml={initialState.current.bpmnXml}>
      <ProcessEditorContent
        initialState={initialState.current}
        load={load}
        apiData={{
          availableDataTypeIds: appMetadata?.dataTypes?.map((dataType) => dataType.id),
          availableDataModelIds,
          allDataModelIds,
          layoutSets,
          existingCustomReceiptLayoutSetId,
          pendingApiOperations: availableDataModelIdsPending || allDataModelIdsPending,
        }}
      />
    </BpmnContextProvider>
  );
}

type ProcessEditorContentProps = {
  initialState: ProcessState;
  load: () => Promise<ProcessState>;
  apiData: Partial<BpmnApiContextProps>;
};

function ProcessEditorContent({ initialState, load, apiData }: ProcessEditorContentProps) {
  const { org, app } = useStudioEnvironmentParams();
  const { status, retry, discard, ...operations } = useProcessOperations({
    initialState,
    org,
    app,
    load,
  });

  return (
    <BpmnApiContextProvider
      {...apiData}
      {...operations}
      pendingApiOperations={apiData.pendingApiOperations || status.pending}
    >
      <BpmnConfigPanelFormContextProvider>
        <StudioRecommendedNextActionContextProvider>
          <div className={classes.editor}>
            {status.failure && (
              <SaveFailureAlert failure={status.failure} retry={retry} discard={discard} />
            )}
            <div className={classes.container} aria-busy={status.pending}>
              <Canvas />
              <ConfigPanel disabled={status.editingBlocked} />
            </div>
          </div>
        </StudioRecommendedNextActionContextProvider>
      </BpmnConfigPanelFormContextProvider>
    </BpmnApiContextProvider>
  );
}

const failureMessageKeys: Record<ProcessSaveFailure['kind'], string> = {
  conflict: 'process_editor.save_conflict',
  lost: 'process_editor.save_failed',
  rejected: 'process_editor.save_rejected',
  loadFailed: 'process_editor.reload_failed',
};

type SaveFailureAlertProps = {
  failure: ProcessSaveFailure;
  retry: () => void;
  discard: () => Promise<void>;
};

function SaveFailureAlert({ failure, retry, discard }: SaveFailureAlertProps): JSX.Element {
  const { t } = useTranslation();
  const canRetry = failure.kind === 'lost';
  const discardLabel =
    failure.kind === 'loadFailed' ? 'general.try_again' : 'process_editor.discard_changes';
  return (
    <StudioAlert data-color='danger' role='alert'>
      <StudioParagraph>{t(failureMessageKeys[failure.kind])}</StudioParagraph>
      {canRetry && <StudioButton onClick={retry}>{t('process_editor.retry_save')}</StudioButton>}
      <StudioButton onClick={() => void discard()} variant={canRetry ? 'secondary' : 'primary'}>
        {t(discardLabel)}
      </StudioButton>
    </StudioAlert>
  );
}
