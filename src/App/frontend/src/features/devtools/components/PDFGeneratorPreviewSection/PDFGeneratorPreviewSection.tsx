import React, { useState } from 'react';

import { Chip, Fieldset } from '@digdir/designsystemet-react';

import { PDFGeneratorPreview } from 'src/components/PDFGeneratorPreview/PDFGeneratorPreview';
import { getDefaultDataTypeFromUiFolder } from 'src/features/form/ui';
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
  const pdfTasks =
    useProcessQuery().data?.processTasks?.filter(
      (task) => task.altinnTaskType === 'pdf' || task.altinnTaskType === 'subformPdf',
    ) ?? [];
  const dataElements = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? [];

  const isSubformPdf = pdfTasks.some(
    (task) => task.elementId === target.taskId && task.altinnTaskType === 'subformPdf',
  );
  // The UI folder of a subform PDF service task uses the subform data type
  const subformDataType = isSubformPdf ? getDefaultDataTypeFromUiFolder(target.taskId) : undefined;
  const subforms = subformDataType ? dataElements.filter((element) => element.dataType === subformDataType) : [];

  return (
    <>
      {pdfTasks.length > 0 && (
        <Fieldset data-size='sm'>
          <Fieldset.Legend>Oppgave</Fieldset.Legend>
          <Chip.Radio
            checked={!target.taskId}
            onClick={() => setTarget({})}
          >
            Nåværende oppgave
          </Chip.Radio>
          {pdfTasks.map((task) => (
            <Chip.Radio
              key={task.elementId}
              checked={target.taskId === task.elementId}
              onClick={() => setTarget({ taskId: task.elementId })}
            >
              {task.elementId}
            </Chip.Radio>
          ))}
        </Fieldset>
      )}
      {isSubformPdf && (
        <Fieldset data-size='sm'>
          <Fieldset.Legend>Underskjema</Fieldset.Legend>
          {subforms.length === 0 && <span>Ingen underskjema å forhåndsvise</span>}
          {subforms.map((element) => (
            <Chip.Radio
              key={element.id}
              checked={target.dataElementId === element.id}
              onClick={() => setTarget({ ...target, dataElementId: element.id })}
            >
              {element.id.slice(0, 8)}
            </Chip.Radio>
          ))}
        </Fieldset>
      )}
      <PDFGeneratorPreview
        showErrorDetails={true}
        buttonTitle='Generer PDF'
        target={target}
        disabled={isSubformPdf && !target.dataElementId}
      />
    </>
  );
}
