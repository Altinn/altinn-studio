import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import classes from './PageGroupAccordion.module.css';
import { useTranslation } from 'react-i18next';
import { PageAccordion } from './PageAccordion';
import { FormLayout } from './FormLayout';
import { StudioButton, StudioHeading } from '@studio/components-legacy';
import { DragVerticalIcon, FolderIcon, PlusIcon, TrashIcon } from '@studio/icons';
import type { IFormLayouts } from '@altinn/ux-editor/types/global';
import {
  duplicatedIdsExistsInLayout,
  findLayoutsContainingDuplicateComponents,
} from '@altinn/ux-editor/utils/formLayoutUtils';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { useDeletePageGroupMutation } from '@altinn/ux-editor/hooks/mutations/useDeletePageGroupMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../hooks';

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

  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { mutate: deletePageGroup, isPending } = useDeletePageGroupMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );

  return groups.map((group, index) => {
    if (!group.order || group.order.length === 0) return null;

    const handleConfirmDelete = () => {
      if (confirm(t('ux_editor.component_group_navigation_deletion_text'))) {
        const updatedGroups = groups.filter((_, i) => i !== index);
        deletePageGroup({
          groups: updatedGroups,
        });
      }
    };

    return (
      <div key={group.order[0].id} className={classes.groupWrapper}>
        <div className={classes.groupHeaderWrapper}>
          <div className={classes.container}>
            <FolderIcon aria-hidden className={classes.liftIcon} />
            <StudioHeading level={3} size='2xs'>
              {group.name}
            </StudioHeading>
          </div>
          <div className={classes.rightIconsContainer}>
            <StudioButton
              title={t('general.delete_item', { item: group.name })}
              color='danger'
              icon={<TrashIcon />}
              onClick={handleConfirmDelete}
              variant='tertiary'
              disabled={isPending}
            />
            <DragVerticalIcon aria-hidden className={classes.rightIcon} />
          </div>
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
