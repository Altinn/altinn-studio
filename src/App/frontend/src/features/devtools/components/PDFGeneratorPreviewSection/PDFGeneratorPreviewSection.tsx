import React, { useState } from 'react';

import { Chip, Fieldset } from '@digdir/designsystemet-react';

import { PDFGeneratorPreview } from 'src/components/PDFGeneratorPreview/PDFGeneratorPreview';
import { getUiConfig } from 'src/features/form/ui';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { isStudioPreview } from 'src/utils/isDev';
import type { PdfPreviewTarget } from 'src/utils/urls/appUrlHelper';

export const PDFGeneratorPreviewSection = () => (
  <Fieldset>
    <Fieldset.Legend>Forhåndsvis PDF</Fieldset.Legend>
    {/* PDF generator is not available in altinn studio preview */}
    {!isStudioPreview() && <PDFGeneratorPreviewWithTarget />}
  </Fieldset>
);

function PDFGeneratorPreviewWithTarget() {
  const [target, setTarget] = useState<PdfPreviewTarget>({});
  const processTasks = useProcessQuery().data?.processTasks ?? [];
  const pdfTasks = processTasks.filter((task) => task.altinnTaskType === 'pdf' || task.altinnTaskType === 'subformPdf');
  const dataElements = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? [];

  const isSubformPdf = pdfTasks.some(
    (task) => task.elementId === target.taskId && task.altinnTaskType === 'subformPdf',
  );
  // A subform PDF service task renders the entries of the subform UI folder it names, which the frontend is not told.
  // Offer the entries of every UI folder that belongs to no task; the preview rejects an entry of another subform.
  const taskIds = new Set(processTasks.map((task) => task.elementId));
  const subformFolders = Object.entries(getUiConfig().folders).flatMap(([folder, settings]) => {
    const subforms = dataElements.filter((element) => element.dataType === settings.defaultDataType);
    return !taskIds.has(folder) && subforms.length > 0 ? [{ folder, subforms }] : [];
  });

  return (
    <>
      {pdfTasks.length > 0 && (
        <Fieldset data-size='sm'>
          <Fieldset.Legend>Oppgave</Fieldset.Legend>
          <Chip.Radio
            name='pdf-preview-task'
            value='current'
            checked={!target.taskId}
            onChange={() => setTarget({})}
          >
            Nåværende oppgave
          </Chip.Radio>
          {pdfTasks.map((task) => (
            <Chip.Radio
              key={task.elementId}
              name='pdf-preview-task'
              value={task.elementId}
              checked={target.taskId === task.elementId}
              onChange={() => setTarget({ taskId: task.elementId })}
            >
              {task.elementId}
            </Chip.Radio>
          ))}
        </Fieldset>
      )}
      {isSubformPdf && subformFolders.length === 0 && (
        <Fieldset data-size='sm'>
          <Fieldset.Legend>Underskjema</Fieldset.Legend>
          <span>Ingen underskjema å forhåndsvise</span>
        </Fieldset>
      )}
      {isSubformPdf &&
        subformFolders.map(({ folder, subforms }) => (
          <Fieldset
            key={folder}
            data-size='sm'
          >
            <Fieldset.Legend>Underskjema i {folder}</Fieldset.Legend>
            {subforms.map((element, index) => (
              <Chip.Radio
                key={element.id}
                name='pdf-preview-subform'
                value={element.id}
                checked={target.dataElementId === element.id}
                onChange={() => setTarget({ ...target, dataElementId: element.id })}
              >
                Underskjema {index + 1} (ID: {element.id})
              </Chip.Radio>
            ))}
          </Fieldset>
        ))}
      <PDFGeneratorPreview
        showErrorDetails={true}
        buttonTitle='Generer PDF'
        target={target}
        disabled={isSubformPdf && !target.dataElementId}
      />
    </>
  );
}
