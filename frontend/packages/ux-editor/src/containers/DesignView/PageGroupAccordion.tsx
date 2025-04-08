import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import classes from './PageGroupAccordion.module.css';
import { useTranslation } from 'react-i18next';
import { PageAccordion } from './PageAccordion';
import { FormLayout } from './FormLayout';
import { StudioButton, StudioHeading } from '@studio/components-legacy';
import { DragVerticalIcon, FolderIcon, PlusIcon } from '@studio/icons';
import type { IFormLayouts } from '@altinn/ux-editor/types/global';
import {
  duplicatedIdsExistsInLayout,
  findLayoutsContainingDuplicateComponents,
} from '@altinn/ux-editor/utils/formLayoutUtils';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';

interface PageGroupAccordionProps {
  groups: PagesModel['groups'];
  layouts: IFormLayouts;
  selectedFormLayoutName: string;
  onAccordionClick: (pageName: string) => void;
  onAddPage: () => void;
  isAddPagePending: boolean;
}

export const PageGroupAccordion = ({
  groups,
  layouts,
  selectedFormLayoutName,
  onAccordionClick,
  onAddPage,
  isAddPagePending,
}: PageGroupAccordionProps): ReactNode => {
  const { t } = useTranslation();
  const layoutsWithDuplicateComponents = useMemo(
    () => findLayoutsContainingDuplicateComponents(layouts),
    [layouts],
  );

  if (!groups?.length) return null;

  return groups.map((group) => {
    if (!group.order || group.order.length === 0) return null;

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
        {group.order.map((page) => {
          const layout = layouts?.[page.id];
          const isInvalidLayout = layout ? duplicatedIdsExistsInLayout(layout) : false;

          return (
            <div key={page.id} className={classes.groupAccordionWrapper}>
              <PageAccordion
                pageName={page.id}
                isOpen={page.id === selectedFormLayoutName}
                onClick={() => onAccordionClick(page.id)}
                isInvalid={isInvalidLayout}
                hasDuplicatedIds={layoutsWithDuplicateComponents.duplicateLayouts.includes(page.id)}
              >
                {page.id === selectedFormLayoutName && (
                  <FormLayout
                    layout={layout}
                    isInvalid={isInvalidLayout}
                    duplicateComponents={layoutsWithDuplicateComponents.duplicateComponents}
                  />
                )}
              </PageAccordion>
            </div>
          );
        })}
        <div className={classes.buttonContainer}>
          <StudioButton
            icon={<PlusIcon aria-hidden />}
            onClick={onAddPage}
            className={classes.button}
            disabled={isAddPagePending}
          >
            {t('ux_editor.pages_add')}
          </StudioButton>
        </div>
      </div>
    );
  });
};
