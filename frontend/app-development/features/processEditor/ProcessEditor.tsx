import { ProcessEditor as ProcessEditorImpl } from '@altinn/process-editor';
import { useBpmnMutation } from 'app-development/hooks/mutations';
import { useBpmnQuery } from 'app-development/hooks/queries/useBpmnQuery';
import React from 'react';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { toast } from 'react-toastify';
import { useAppLibVersionQuery } from 'app-development/hooks/queries';
import { Spinner } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export const ProcessEditor = () => {
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();
  const { data: bpmnXml, isError: hasBpmnQueryError } = useBpmnQuery(org, app);

  const { data: appLibData, isLoading: appLibDataLoading } = useAppLibVersionQuery(org, app);

  const bpmnMutation = useBpmnMutation(org, app);

  const saveBpmnXml = async (xml: string): Promise<void> => {
    await bpmnMutation.mutateAsync(
      { bpmnXml: xml },
      {
        onSuccess: () => {
          toast.success('Bpmn saved successfully');
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
      bpmnXml={hasBpmnQueryError ? null : bpmnXml}
      onSave={saveBpmnXml}
      appLibVersion={appLibData.version}
    />
  );
};
