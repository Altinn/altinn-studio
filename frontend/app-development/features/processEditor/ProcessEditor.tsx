import { ProcessEditor as ProcessEditorImpl } from '@altinn/process-editor';
import { useBpmnMutation } from 'app-development/hooks/mutations';
import { useBpmnQuery } from 'app-development/hooks/queries/useBpmnQuery';
import React from 'react';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { toast } from 'react-toastify';
import { Spinner } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import type { BpmnDetails } from '@altinn/process-editor/src/types/BpmnDetails';
import { useUpdateLayoutSetMutation } from '../../hooks/mutations/useUpdateLayoutSetMutation';
import { useAddLayoutSetMutation } from '../../hooks/mutations/useAddLayoutSetMutation';
import { useCustomReceiptLayoutSetName } from 'app-shared/hooks/useCustomReceiptLayoutSetName';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';

export const ProcessEditor = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioUrlParams();
  const { data: bpmnXml, isError: hasBpmnQueryError } = useBpmnQuery(org, app);
  const { data: appLibData, isLoading: appLibDataLoading } = useAppVersionQuery(org, app);
  const bpmnMutation = useBpmnMutation(org, app);
  const { mutate: mutateLayoutSet } = useUpdateLayoutSetMutation(org, app);
  const { mutate: addLayoutSet } = useAddLayoutSetMutation(org, app);
  const existingCustomReceiptName: string | undefined = useCustomReceiptLayoutSetName(org, app);
  const { data: availableDataModelIds } = useAppMetadataModelIdsQuery(org, app);
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const saveBpmnXml = async (
    xml: string,
    dataTasksChanged?: { added?: BpmnDetails[]; removed?: BpmnDetails[] },
  ): Promise<void> => {
    await bpmnMutation.mutateAsync(
      { bpmnXml: xml },
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
      availableDataModelIds={availableDataModelIds}
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
