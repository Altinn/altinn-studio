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
import { StudioButton, StudioHeading } from '@studio/components-legacy';
import {
  duplicatedIdsExistsInLayout,
  findLayoutsContainingDuplicateComponents,
} from '../../utils/formLayoutUtils';
import { PdfLayoutAccordion } from '@altinn/ux-editor/containers/DesignView/PdfLayout/PdfLayoutAccordion';
import { mapFormLayoutsToFormLayoutPages } from '@altinn/ux-editor/utils/formLayoutsUtils';
import { DragVerticalIcon, FolderIcon, PlusIcon } from '@studio/icons';
import { usePdf } from '../../hooks/usePdf/usePdf';
import { usePagesQuery } from '../../hooks/queries/usePagesQuery';
import { useAddPageMutation } from '../../hooks/mutations/useAddPageMutation';
import type { PageModel } from 'app-shared/types/api/dto/PageModel';
import { DesignViewNavigation } from '../DesignViewNavigation';
import { shouldDisplayFeature, FeatureFlag } from 'app-shared/utils/featureToggleUtils';

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
  const { data: pagesModel } = usePagesQuery(org, app, selectedFormLayoutSetName);
  const { mutate: addPageMutation, isPending: isAddPageMutationPending } = useAddPageMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );
  // Referring to useFormLayoutSettingsQuery twice is a hack to ensure designView is re-rendered after converting
  // a newly added layout to a PDF. See issue: https://github.com/Altinn/altinn-studio/issues/13679
  useFormLayoutSettingsQuery(org, app, selectedFormLayoutSetName);
  const layouts = useFormLayouts();
  const { getPdfLayoutName } = usePdf();

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
    const layout = formLayoutData?.find((formLayout) => formLayout.page === pageModel.id);

    // If the layout does not exist, return null
    if (layout === undefined) return null;

    // Check if the layout has unique component IDs
    const isInvalidLayout = duplicatedIdsExistsInLayout(layout.data);

    return (
      <PageAccordion
        key={pageModel.id}
        pageName={pageModel.id}
        isOpen={pageModel.id === selectedFormLayoutName}
        onClick={() => handleClickAccordion(pageModel.id)}
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

  // Mock data for groups(Just for testing, will be replaced with actual data)
  const mockGroups = !pagesModel?.pages?.length
    ? []
    : [
        {
          name: 'Sideoppsett 1',
          type: 'Sideoppsett 1',
          pages: pagesModel.pages.slice(0, 1).map((page) => ({ id: page.id })),
        },
        {
          name: 'sideoppsett 2',
          type: 'sideoppsett 2',
          markWhenCompleted: true,
          pages: pagesModel.pages.slice(1, 4).map((page) => ({ id: page.id })),
        },
        {
          name: 'sideoppsett 3',
          type: 'sideoppsett 3',
          pages: pagesModel.pages.slice(4, 6).map((page) => ({ id: page.id })),
        },
      ];

  const displayGroupAccordions = !mockGroups.length
    ? null
    : mockGroups.map((group) => {
        if (!group.pages || group.pages.length === 0) {
          return null;
        }
        return (
          <div key={group.name}>
            <div className={classes.groupHeaderWrapper}>
              <div className={classes.container}>
                <FolderIcon aria-hidden className={classes.liftIcon} />
                <StudioHeading level={3} size='2xs'>
                  {group.name}
                </StudioHeading>
              </div>
              <DragVerticalIcon aria-hidden className={classes.rightIcon} />
            </div>

            {group.pages.map((page) => {
              const layout = formLayoutData?.find((formLayout) => formLayout.page === page.id);
              if (!layout) {
                console.warn(`Layout not found for page: ${page.id}`);
                return null;
              }

              const isInvalidLayout = duplicatedIdsExistsInLayout(layout.data);

              return (
                <div key={page.id} className={classes.groupAccordionWrapper}>
                  <PageAccordion
                    key={page.id}
                    pageName={page.id}
                    isOpen={page.id === selectedFormLayoutName}
                    onClick={() => handleClickAccordion(page.id)}
                    isInvalid={isInvalidLayout}
                    hasDuplicatedIds={layoutsWithDuplicateComponents.duplicateLayouts.includes(
                      page.id,
                    )}
                  >
                    {page.id === selectedFormLayoutName && (
                      <FormLayout
                        layout={layout.data}
                        isInvalid={isInvalidLayout}
                        duplicateComponents={layoutsWithDuplicateComponents.duplicateComponents}
                      />
                    )}
                  </PageAccordion>
                </div>
              );
            })}
          </div>
        );
      });

  const hasGroups = mockGroups.length > 0;
  const isTaskNavigationPageGroups = shouldDisplayFeature(FeatureFlag.TaskNavigationPageGroups);

  return (
    <div className={classes.root}>
      <div className={classes.wrapper}>
        {isTaskNavigationPageGroups && <DesignViewNavigation />}
        <div className={classes.accordionWrapper}>
          {hasGroups ? (
            <>{displayGroupAccordions}</>
          ) : (
            pagesModel?.pages?.length > 0 && (
              <Accordion color='neutral'>{displayPageAccordions}</Accordion>
            )
          )}
        </div>
      </div>
      <div className={classes.buttonContainer}>
        <StudioButton
          icon={<PlusIcon aria-hidden />}
          onClick={() => handleAddPage()}
          className={classes.button}
          disabled={isAddPageMutationPending}
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
