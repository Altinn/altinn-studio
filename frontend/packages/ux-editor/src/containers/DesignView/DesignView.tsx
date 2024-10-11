import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import classes from './DesignView.module.css';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Accordion } from '@digdir/designsystemet-react';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { useAddLayoutMutation } from '../../hooks/mutations/useAddLayoutMutation';
import { PageAccordion } from './PageAccordion';
import { useAppContext, useFormLayouts } from '../../hooks';
import { FormLayout } from './FormLayout';
import { StudioButton } from '@studio/components';
import {
  duplicatedIdsExistsInLayout,
  findLayoutsContainingDuplicateComponents,
} from '../../utils/formLayoutUtils';
import { PdfLayoutAccordion } from '@altinn/ux-editor/containers/DesignView/PdfLayout/PdfLayoutAccordion';
import { mapFormLayoutsToFormLayoutPages } from '@altinn/ux-editor/utils/formLayoutsUtils';
import { PlusIcon } from '@studio/icons';
import { usePdf } from '../../hooks/usePdf/usePdf';

/**
 * Maps the IFormLayouts object to a list of FormLayouts
 */

/**
 * @component
 *    Displays the column containing accordions with components for each page
 *
 * @returns {ReactNode} - The rendered component
 */
export const DesignView = (): ReactNode => {
  const { org, app } = useStudioEnvironmentParams();
  const {
    selectedFormLayoutSetName,
    selectedFormLayoutName,
    setSelectedFormLayoutName,
    updateLayoutsForPreview,
  } = useAppContext();
  const { mutate: addLayoutMutation, isPending: isAddLayoutMutationPending } = useAddLayoutMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );
  // Referring to useFormLayoutSettingsQuery twice is a hack to ensure designView is re-rendered after converting
  // a newly added layout to a PDF. See issue: https://github.com/Altinn/altinn-studio/issues/13679
  useFormLayoutSettingsQuery(org, app, selectedFormLayoutSetName);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const layouts = useFormLayouts();
  const { getPdfLayoutName } = usePdf();
  const layoutOrder = formLayoutSettings?.pages?.order;

  const { t } = useTranslation();

  const formLayoutData = mapFormLayoutsToFormLayoutPages(layouts);

  /**
   * Handles the click of an accordion. It updates the URL and sets the
   * local storage for which page view that is open
   *
   * @param pageName the name of the accordion clicked
   */
  const handleClickAccordion = (pageName: string) => {
    if (selectedFormLayoutName !== pageName) {
      setSelectedFormLayoutName(pageName);
    } else {
      setSelectedFormLayoutName(undefined);
    }
  };

  const handleAddPage = () => {
    let newNum = layoutOrder.length + 1;
    let newLayoutName = `${t('ux_editor.page')}${newNum}`;

    while (layoutOrder.includes(newLayoutName) || getPdfLayoutName() === newLayoutName) {
      newNum += 1;
      newLayoutName = `${t('ux_editor.page')}${newNum}`;
    }
    addLayoutMutation(
      { layoutName: newLayoutName },
      {
        onSuccess: async () => {
          await updateLayoutsForPreview(selectedFormLayoutSetName);
        },
      },
    );
  };

  const layoutsWithDuplicateComponents = useMemo(
    () => findLayoutsContainingDuplicateComponents(layouts),
    [layouts],
  );

  /**
   * Displays the pages as an ordered list
   */
  const displayPageAccordions = layoutOrder.map((pageName, i) => {
    const layout = formLayoutData?.find((formLayout) => formLayout.page === pageName);

    // If the layout does not exist, return null
    if (layout === undefined) return null;

    // Check if the layout has unique component IDs
    const isInvalidLayout = duplicatedIdsExistsInLayout(layout.data);

    return (
      <PageAccordion
        key={i}
        pageName={layout.page}
        isOpen={layout.page === selectedFormLayoutName}
        onClick={() => handleClickAccordion(layout.page)}
        isInvalid={isInvalidLayout}
        hasDuplicatedIds={layoutsWithDuplicateComponents.duplicateLayouts.includes(layout.page)}
      >
        {layout.page === selectedFormLayoutName && (
          <FormLayout
            layout={layout.data}
            isInvalid={isInvalidLayout}
            duplicateComponents={layoutsWithDuplicateComponents.duplicateComponents}
          />
        )}
      </PageAccordion>
    );
  });

  return (
    <div className={classes.root}>
      <div className={classes.wrapper}>
        <div className={classes.accordionWrapper}>
          <Accordion color='neutral'>{displayPageAccordions}</Accordion>
        </div>
      </div>
      <div className={classes.buttonContainer}>
        <StudioButton
          icon={<PlusIcon aria-hidden />}
          onClick={() => handleAddPage()}
          className={classes.button}
          disabled={isAddLayoutMutationPending}
        >
          {t('ux_editor.pages_add')}
        </StudioButton>
      </div>
      {getPdfLayoutName() && (
        <div className={classes.wrapper}>
          <div className={classes.accordionWrapper}>
            <PdfLayoutAccordion
              pdfLayoutName={getPdfLayoutName()}
              selectedFormLayoutName={selectedFormLayoutName}
              onAccordionClick={() => handleClickAccordion(getPdfLayoutName())}
              hasDuplicatedIds={layoutsWithDuplicateComponents.duplicateLayouts.includes(
                getPdfLayoutName(),
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
};
