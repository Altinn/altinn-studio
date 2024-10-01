import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import classes from './DesignView.module.css';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Accordion } from '@digdir/designsystemet-react';
import type { IFormLayouts } from '../../types/global';
import type { FormLayoutPage } from '../../types/FormLayoutPage';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { PlusIcon } from '@studio/icons';
import { useAddLayoutMutation } from '../../hooks/mutations/useAddLayoutMutation';
import { PageAccordion } from './PageAccordion';
import { useAppContext, useFormLayouts } from '../../hooks';
import { FormLayout } from './FormLayout';
import { StudioButton } from '@studio/components';
import {
  duplicatedIdsExistsInLayout,
  findLayoutsContainingDuplicateComponents,
} from '../../utils/formLayoutUtils';

/**
 * Maps the IFormLayouts object to a list of FormLayouts
 */
const mapFormLayoutsToFormLayoutPages = (formLayouts: IFormLayouts): FormLayoutPage[] => {
  return Object.entries(formLayouts).map(([key, value]) => ({
    page: key,
    data: value,
  }));
};

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
    refetchAppLayouts,
  } = useAppContext();
  const { mutate: addLayoutMutation, isPending: isAddLayoutMutationPending } = useAddLayoutMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const layouts = useFormLayouts();
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(
    org,
    app,
    selectedFormLayoutSetName,
  );
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
    let newNum = 1;
    let newLayoutName = `${t('ux_editor.page')}${layoutOrder.length + newNum}`;

    while (layoutOrder.indexOf(newLayoutName) > -1) {
      newNum += 1;
      newLayoutName = `${t('ux_editor.page')}${newNum}`;
    }
    addLayoutMutation(
      { layoutName: newLayoutName },
      {
        onSuccess: async () => {
          await refetchAppLayouts(selectedFormLayoutSetName);
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
    const isValidLayout = !duplicatedIdsExistsInLayout(layout.data);

    return (
      <PageAccordion
        key={i}
        pageName={layout.page}
        isOpen={layout.page === selectedFormLayoutName}
        onClick={() => handleClickAccordion(layout.page)}
        isValid={isValidLayout}
        hasUniqueIds={!layoutsWithDuplicateComponents.duplicateLayouts.includes(layout.page)}
      >
        {layout.page === selectedFormLayoutName && (
          <FormLayout
            layout={layout.data}
            isValid={isValidLayout}
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
    </div>
  );
};
