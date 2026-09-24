import React, { useState } from 'react';

import { Chip, Fieldset } from '@digdir/designsystemet-react';

import { PDFGeneratorPreview } from 'src/components/PDFGeneratorPreview/PDFGeneratorPreview';
import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { skipToken, useQuery } from 'src/core/queries/reactQuery';
import { getUiFolderSettings } from 'src/features/form/ui';
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

  const subformPdfTaskId = pdfTasks.find(
    (task) => task.elementId === target.taskId && task.altinnTaskType === 'subformPdf',
  )?.elementId;
  const isSubformPdf = subformPdfTaskId !== undefined;
  const subformDataTypes = useSubformDataTypes(subformPdfTaskId);
  const subforms = dataElements.filter((element) => subformDataTypes.includes(element.dataType));

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

/**
 * A subform PDF service task renders its subform through the Subform component in the task's own UI folder, so the
 * default data type of that component's layout set is the data type of the subforms the task makes PDFs of. If the
 * folder has several Subform components, the one it renders is the one whose data type the folder itself uses, as in
 * the documented setup.
 */
function useSubformDataTypes(taskId: string | undefined): string[] {
  const { fetchLayouts } = useAppQueries();
  const { data } = useQuery({
    queryKey: ['pdfPreviewSubformDataTypes', taskId],
    queryFn: taskId ? () => fetchLayouts(taskId) : skipToken,
    select: (layouts) =>
      Object.values(layouts)
        .flatMap((page) => page.data.layout)
        .flatMap((component) =>
          component.type === 'Subform' ? [getUiFolderSettings(component.layoutSet)?.defaultDataType] : [],
        )
        .filter((dataType) => dataType !== undefined),
  });
  const dataTypes = data ?? [];
  const folderDataType = getUiFolderSettings(taskId)?.defaultDataType;
  return folderDataType !== undefined && dataTypes.includes(folderDataType) ? [folderDataType] : dataTypes;
}
