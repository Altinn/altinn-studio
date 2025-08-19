import React from 'react';
import { PageAccordion } from '@altinn/ux-editor/containers/DesignView/PageAccordion';
import { duplicatedIdsExistsInLayout } from '@altinn/ux-editor/utils/formLayoutUtils';
import { FormLayout } from '@altinn/ux-editor/containers/DesignView/FormLayout';
import { Accordion } from '@digdir/designsystemet-react';
import { useFormLayouts } from '@altinn/ux-editor/hooks';
import { mapFormLayoutsToFormLayoutPages } from '@altinn/ux-editor/utils/formLayoutsUtils';

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
  const layouts = useFormLayouts();
  const formLayoutData = mapFormLayoutsToFormLayoutPages(layouts);
  const pdfLayoutData = formLayoutData.find((formLayout) => formLayout.page === pdfLayoutName);
  if (!pdfLayoutData) return null;

  return (
    <Accordion>
      <PageAccordion
        pageName={pdfLayoutData.page}
        isOpen={pdfLayoutData.page === selectedFormLayoutName}
        onClick={onAccordionClick}
        isInvalid={duplicatedIdsExistsInLayout(pdfLayoutData.data)}
        hasDuplicatedIds={hasDuplicatedIds}
        showNavigationMenu={false}
        pageIsPdf={true}
      >
        {pdfLayoutData.page === selectedFormLayoutName && (
          <FormLayout
            layout={pdfLayoutData.data}
            isInvalid={duplicatedIdsExistsInLayout(pdfLayoutData.data)}
          />
        )}
      </PageAccordion>
    </Accordion>
  );
};
