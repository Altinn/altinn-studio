import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import classes from './PageGroupAccordion.module.css';
import { useTranslation } from 'react-i18next';
import { PageAccordion } from './PageAccordion';
import { FormLayout } from './FormLayout';
import { StudioHeading } from '@studio/components-legacy';
import { StudioButton, StudioPopover } from '@studio/components';
import { MenuElipsisVerticalIcon, FolderIcon, PlusIcon, TrashIcon } from '@studio/icons';
import type { IFormLayouts } from '@altinn/ux-editor/types/global';
import {
  duplicatedIdsExistsInLayout,
  findLayoutsContainingDuplicateComponents,
} from '@altinn/ux-editor/utils/formLayoutUtils';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { useDeletePageGroupMutation } from '@altinn/ux-editor/hooks/mutations/useDeletePageGroupMutation';
import { useChangePageGroupOrder } from '../../hooks/mutations/useChangePageGroupOrder';
import { useAppContext } from '../../hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { pageGroupAccordionHeader } from '@studio/testing/testids';

export interface PageGroupAccordionProps {
  pages: PagesModel;
  layouts: IFormLayouts;
  selectedFormLayoutName: string;
  onAccordionClick: (pageName: string) => void;
  onAddPage: () => void;
  isAddPagePending: boolean;
}

export const PageGroupAccordion = ({
  pages,
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
  const { selectedFormLayoutSetName } = useAppContext();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: changePageGroupOrder } = useChangePageGroupOrder(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const { mutate: deletePageGroup, isPending } = useDeletePageGroupMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const moveGroupUp = (groupIndex: number) => {
    const newGroups = [...pages.groups];
    const moveGroup = newGroups.splice(groupIndex, 1);
    newGroups.splice(groupIndex - 1, 0, ...moveGroup);
    changePageGroupOrder({ ...pages, groups: newGroups });
  };

  const moveGroupDown = (groupIndex: number) => {
    const newGroups = [...pages.groups];
    const moveGroup = newGroups.splice(groupIndex, 1);
    newGroups.splice(groupIndex + 1, 0, ...moveGroup);
    changePageGroupOrder({ ...pages, groups: newGroups });
  };

  return pages?.groups.map((group, groupIndex) => {
    if (!group.order || group.order.length === 0) return null;

    const handleConfirmDelete = () => {
      if (confirm(t('ux_editor.component_group_navigation_deletion_text'))) {
        const updatedGroups = pages.groups.filter((_, i) => i !== groupIndex);
        deletePageGroup({
          groups: updatedGroups,
        });
      }
    };

    return (
      <div key={group.order[0].id} className={classes.groupWrapper}>
        <div
          className={classes.groupHeaderWrapper}
          data-testid={pageGroupAccordionHeader(groupIndex)}
        >
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
            <StudioPopover.TriggerContext>
              <StudioPopover.Trigger variant='tertiary'>
                <MenuElipsisVerticalIcon />
              </StudioPopover.Trigger>
              <StudioPopover placement='bottom'>
                <div className={classes.ellipsisMenuContent}>
                  <StudioButton
                    variant='tertiary'
                    onClick={() => moveGroupUp(groupIndex)}
                    disabled={groupIndex === 0}
                  >
                    {t('ux_editor.page_menu_up')}
                  </StudioButton>
                  <StudioButton
                    variant='tertiary'
                    onClick={() => moveGroupDown(groupIndex)}
                    disabled={groupIndex === pages.groups.length - 1}
                  >
                    {t('ux_editor.page_menu_down')}
                  </StudioButton>
                </div>
              </StudioPopover>
            </StudioPopover.TriggerContext>
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
