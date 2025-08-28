import React from 'react';
import { Accordion } from '@digdir/designsystemet-react';
import { PageAccordion } from '../PageAccordion';
import { FormLayout } from '../FormLayout';
import { useFormLayouts } from '../../../../../hooks';
import { mapFormLayoutsToFormLayoutPages } from '../../../../../utils/formLayoutsUtils';
import { duplicatedIdsExistsInLayout } from '../../../../../utils/formLayoutUtils';

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
