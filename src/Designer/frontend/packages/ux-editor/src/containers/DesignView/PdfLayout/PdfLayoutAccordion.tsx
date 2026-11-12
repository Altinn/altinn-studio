import React from 'react';
import { PageAccordion } from '@altinn/ux-editor/containers/DesignView/PageAccordion';
import { duplicatedIdsExistsInLayout } from '@altinn/ux-editor/utils/formLayoutUtils';
import { FormLayout } from '@altinn/ux-editor/containers/DesignView/FormLayout';
import { useFormLayouts } from '@altinn/ux-editor/hooks';
import { mapFormLayoutsToFormLayoutPages } from '@altinn/ux-editor/utils/formLayoutsUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';
import { useLayoutSetsExtendedQuery } from '@altinn/ux-editor/hooks/queries/useLayoutSetsExtendedQuery';

export interface PdfLayoutAccordionProps {
  pdfLayoutName: string;
  selectedFormLayoutName: string;
  onAccordionClick: () => void;
  hasDuplicatedIds: boolean;
}
export const PdfLayoutAccordion = ({
  pdfLayoutName,
  selectedFormLayoutName,
  onAccordionClick,
  hasDuplicatedIds,
}: PdfLayoutAccordionProps): React.ReactNode => {
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSet } = useUxEditorParams();
  const { data: layoutSets } = useLayoutSetsExtendedQuery(org, app);
  const layouts = useFormLayouts();
  const formLayoutData = mapFormLayoutsToFormLayoutPages(layouts);
  const pdfLayoutData = formLayoutData.find((formLayout) => formLayout.page === pdfLayoutName);
  if (!pdfLayoutData) return null;

  // A PDF task's PDF is drawn from this page, and the app does not build without it. Choosing the
  // automatic PDF in the process editor removes the task's folder instead.
  const isPdfTaskFolder = layoutSets?.find((set) => set.id === layoutSet)?.taskType === 'pdf';

  return (
    <PageAccordion
      pageId={pdfLayoutData.page}
      isOpen={pdfLayoutData.page === selectedFormLayoutName}
      onClick={onAccordionClick}
      isInvalid={duplicatedIdsExistsInLayout(pdfLayoutData.data)}
      hasDuplicatedIds={hasDuplicatedIds}
      showNavigationMenu={false}
      showDeleteButton={!isPdfTaskFolder}
      pageIsPdf={true}
    >
      {pdfLayoutData.page === selectedFormLayoutName && (
        <FormLayout
          layout={pdfLayoutData.data}
          isInvalid={duplicatedIdsExistsInLayout(pdfLayoutData.data)}
        />
      )}
    </PageAccordion>
  );
};
