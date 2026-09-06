import React, { useEffect, useMemo, useState } from 'react';

import { Chip, Fieldset } from '@digdir/designsystemet-react';
import { skipToken, useQuery } from '@tanstack/react-query';

import { PDFGeneratorPreview } from 'src/components/PDFGeneratorPreview/PDFGeneratorPreview';
import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { isStudioPreview } from 'src/utils/isDev';
import type { IPdfPreviewDataElement, IPdfPreviewTask } from 'src/features/pdf/types';

const texts = {
  legend: 'Forhåndsvis PDF',
  targetLegend: 'Hva skal forhåndsvises?',
  currentTask: 'Nåværende oppgave',
  pdfSuffix: ' (PDF)',
  subformPdfSuffix: ' (underskjema-PDF)',
  dataElementLegend: 'Velg dataelement',
  noDataElements: 'Ingen dataelementer å forhåndsvise',
  generateButton: 'Generer PDF',
};

function taskLabel(task: IPdfPreviewTask): string {
  const suffix =
    task.taskType === 'pdf' ? texts.pdfSuffix : task.taskType === 'subformPdf' ? texts.subformPdfSuffix : '';
  return `${task.taskId}${suffix}`;
}

function dataElementLabel(dataElement: IPdfPreviewDataElement): string {
  return `${dataElement.dataType} – ${dataElement.id.slice(0, 8)}`;
}

export const PDFGeneratorPreviewSection = () => {
  const instanceId = useLaxInstanceId();

  // PDF generator is not available in altinn studio preview
  if (isStudioPreview()) {
    return (
      <Fieldset>
        <Fieldset.Legend>{texts.legend}</Fieldset.Legend>
      </Fieldset>
    );
  }

  return <InnerPDFGeneratorPreviewSection instanceId={instanceId} />;
};

function InnerPDFGeneratorPreviewSection({ instanceId }: { instanceId: string | undefined }) {
  const { fetchPdfPreviewTasks } = useAppQueries();
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined);
  const [selectedDataElementId, setSelectedDataElementId] = useState<string | undefined>(undefined);

  const { data, error } = useQuery({
    queryKey: ['pdfPreviewTasks', instanceId],
    queryFn: instanceId ? () => fetchPdfPreviewTasks(instanceId) : skipToken,
    enabled: !!instanceId,
    staleTime: 5000,
  });

  useEffect(() => {
    error && window.logError('Fetching PDF preview tasks failed:\n', error);
  }, [error]);

  const tasks = error ? [] : (data?.tasks ?? []);
  const selectedTask = tasks.find((task) => task.taskId === selectedTaskId);
  const dataElements = useMemo(() => selectedTask?.dataElements ?? [], [selectedTask]);

  useEffect(() => {
    if (selectedTask?.taskType === 'subformPdf') {
      setSelectedDataElementId((current) =>
        current && dataElements.some((el) => el.id === current) ? current : dataElements.at(0)?.id,
      );
    } else {
      setSelectedDataElementId(undefined);
    }
  }, [selectedTask, dataElements]);

  const isSubformPdf = selectedTask?.taskType === 'subformPdf';
  const missingDataElement = isSubformPdf && !selectedDataElementId;

  return (
    <Fieldset>
      <Fieldset.Legend>{texts.legend}</Fieldset.Legend>
      {tasks.length > 0 && (
        <Fieldset data-size='sm'>
          <Fieldset.Legend>{texts.targetLegend}</Fieldset.Legend>
          <Chip.Radio
            checked={selectedTaskId === undefined}
            onClick={() => setSelectedTaskId(undefined)}
          >
            {texts.currentTask}
          </Chip.Radio>
          {tasks.map((task) => (
            <Chip.Radio
              key={task.taskId}
              checked={selectedTaskId === task.taskId}
              onClick={() => setSelectedTaskId(task.taskId)}
            >
              {taskLabel(task)}
            </Chip.Radio>
          ))}
        </Fieldset>
      )}
      {isSubformPdf && (
        <Fieldset data-size='sm'>
          <Fieldset.Legend>{texts.dataElementLegend}</Fieldset.Legend>
          {dataElements.length > 0 ? (
            dataElements.map((dataElement) => (
              <Chip.Radio
                key={dataElement.id}
                checked={selectedDataElementId === dataElement.id}
                onClick={() => setSelectedDataElementId(dataElement.id)}
              >
                {dataElementLabel(dataElement)}
              </Chip.Radio>
            ))
          ) : (
            <span>{texts.noDataElements}</span>
          )}
        </Fieldset>
      )}
      <PDFGeneratorPreview
        showErrorDetails={true}
        buttonTitle={texts.generateButton}
        taskId={selectedTaskId}
        dataElementId={selectedDataElementId}
        disabled={missingDataElement}
      />
    </Fieldset>
  );
}
