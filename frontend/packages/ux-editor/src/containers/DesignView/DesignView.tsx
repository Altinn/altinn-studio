import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import classes from './DesignView.module.css';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Accordion } from '@digdir/designsystemet-react';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { PageAccordion } from './PageAccordion';
import { useAppContext, useFormLayouts } from '../../hooks';
import { FormLayout } from './FormLayout';
import { StudioButton } from '@studio/components-legacy';
import {
  duplicatedIdsExistsInLayout,
  findLayoutsContainingDuplicateComponents,
} from '../../utils/formLayoutUtils';
import { PdfLayoutAccordion } from '@altinn/ux-editor/containers/DesignView/PdfLayout/PdfLayoutAccordion';
import { PlusIcon } from '@studio/icons';
import { usePdf } from '../../hooks/usePdf/usePdf';
import { usePagesQuery } from '../../hooks/queries/usePagesQuery';
import { useAddPageMutation } from '../../hooks/mutations/useAddPageMutation';
import type { PageModel } from 'app-shared/types/api/dto/PageModel';
import { DesignViewNavigation } from '../DesignViewNavigation';
import { shouldDisplayFeature, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { PageGroupAccordion } from './PageGroupAccordion';
import { useAddGroupMutation } from '../../hooks/mutations/useAddGroupMutation';
import { ItemType } from '../../../../ux-editor/src/components/Properties/ItemType';

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
    setSelectedItem,
    setSelectedFormLayoutName,
    updateLayoutsForPreview,
  } = useAppContext();
  const { data: pagesModel } = usePagesQuery(org, app, selectedFormLayoutSetName);
  const { mutate: addPageMutation, isPending: isAddPageMutationPending } = useAddPageMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const { mutate: addGroupMutation, isPending: isAddGroupMutationPending } = useAddGroupMutation(
    org,
    app,
  );

  // Referring to useFormLayoutSettingsQuery twice is a hack to ensure designView is re-rendered after converting
  // a newly added layout to a PDF. See issue: https://github.com/Altinn/altinn-studio/issues/13679
  useFormLayoutSettingsQuery(org, app, selectedFormLayoutSetName);
  const layouts = useFormLayouts();
  const { getPdfLayoutName } = usePdf();

  const { t } = useTranslation();

  /**
   * Handles the click of an accordion. It updates the URL and sets the
   * local storage for which page view that is open
   *
   * @param pageName the name of the accordion clicked
   */
  const handleClickAccordion = (pageName: string) => {
    if (selectedFormLayoutName !== pageName) {
      setSelectedFormLayoutName(pageName);
      setSelectedItem({
        type: ItemType.Page,
        id: pageName,
      });
    } else {
      setSelectedFormLayoutName(undefined);
      setSelectedItem({
        type: ItemType.Page,
        id: pageName,
      });
    }
  };

  const handleAddPage = () => {
    let newNum = pagesModel?.pages?.length + 1;
    let newLayoutName = `${t('ux_editor.page')}${newNum}`;

    while (
      pagesModel?.pages?.find((page) => page.id === newLayoutName) ||
      getPdfLayoutName() === newLayoutName
    ) {
      newNum += 1;
      newLayoutName = `${t('ux_editor.page')}${newNum}`;
    }
    const page: PageModel = {
      id: newLayoutName,
    };
    addPageMutation(page, {
      onSuccess: async () => {
        setSelectedFormLayoutName(page.id);
        await updateLayoutsForPreview(selectedFormLayoutSetName);
      },
    });
  };

  const layoutsWithDuplicateComponents = useMemo(
    () => findLayoutsContainingDuplicateComponents(layouts),
    [layouts],
  );

  /**
   * Displays the pages as an ordered list
   */
  const displayPageAccordions = pagesModel?.pages?.map((pageModel) => {
    const layout = layouts?.[pageModel.id];

    // If the layout does not exist, return null
    if (layout === undefined) return null;

    // Check if the layout has unique component IDs
    const isInvalidLayout = duplicatedIdsExistsInLayout(layout);

    return (
      <PageAccordion
        key={pageModel.id}
        pageName={pageModel.id}
        isOpen={pageModel.id === selectedFormLayoutName}
        onClick={() => handleClickAccordion(pageModel.id)}
        isInvalid={isInvalidLayout}
        hasDuplicatedIds={layoutsWithDuplicateComponents.duplicateLayouts.includes(pageModel.id)}
      >
        {pageModel.id === selectedFormLayoutName && (
          <FormLayout
            layout={layout}
            isInvalid={isInvalidLayout}
            duplicateComponents={layoutsWithDuplicateComponents.duplicateComponents}
          />
        )}
      </PageAccordion>
    );
  });

  const hasGroups = pagesModel?.groups?.length > 0;

  const isTaskNavigationPageGroups = shouldDisplayFeature(FeatureFlag.TaskNavigationPageGroups);
  const handleAddGroup = () => addGroupMutation();

  return (
    <div className={classes.root}>
      <div className={classes.wrapper}>
        {isTaskNavigationPageGroups && <DesignViewNavigation />}
        <div className={classes.accordionWrapper}>
          {isTaskNavigationPageGroups && hasGroups ? (
            <PageGroupAccordion
              pages={pagesModel}
              layouts={layouts}
              selectedFormLayoutName={selectedFormLayoutName}
              onAccordionClick={handleClickAccordion}
              isAddPagePending={isAddPageMutationPending}
            />
          ) : (
            pagesModel?.pages?.length > 0 && (
              <Accordion color='neutral'>{displayPageAccordions}</Accordion>
            )
          )}
        </div>
      </div>
      <div className={classes.buttonContainer}>
        {!hasGroups && (
          <StudioButton
            icon={<PlusIcon aria-hidden />}
            onClick={() => handleAddPage()}
            className={classes.button}
            disabled={isAddPageMutationPending}
          >
            {t('ux_editor.pages_add')}
          </StudioButton>
        )}
        {hasGroups && (
          <StudioButton
            icon={<PlusIcon aria-hidden />}
            onClick={handleAddGroup}
            className={classes.button}
            disabled={isAddGroupMutationPending}
          >
            {t('ux_editor.groups.add')}
          </StudioButton>
        )}
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
