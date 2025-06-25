import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import classes from './PageGroupAccordion.module.css';
import { useTranslation } from 'react-i18next';
import { PageAccordion } from './PageAccordion';
import { FormLayout } from './FormLayout';
import { StudioDeleteButton, StudioHeading } from '@studio/components-legacy';
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
import { Accordion } from '@digdir/designsystemet-react';
import cn from 'classnames';
import { ItemType } from '../../../../ux-editor/src/components/Properties/ItemType';
import { usePagesQuery } from '../../hooks/queries/usePagesQuery';
import { useAddPageToGroup } from '../../hooks/mutations/useAddPageToGroup';

export interface PageGroupAccordionProps {
  pages: PagesModel;
  layouts: IFormLayouts;
  selectedFormLayoutName: string;
  onAccordionClick: (pageName: string) => void;
  isAddPagePending: boolean;
}

export const PageGroupAccordion = ({
  pages,
  layouts,
  selectedFormLayoutName,
  onAccordionClick,
  isAddPagePending,
}: PageGroupAccordionProps): ReactNode => {
  const { t } = useTranslation();
  const layoutsWithDuplicateComponents = useMemo(
    () => findLayoutsContainingDuplicateComponents(layouts),
    [layouts],
  );
  const { selectedFormLayoutSetName, selectedItem, setSelectedItem } = useAppContext();
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

  const { data: pagesModel } = usePagesQuery(org, app, selectedFormLayoutSetName);
  const { addPageToGroup: handleAddPageInsideGroup } = useAddPageToGroup(pagesModel);

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
        if (selectedItem?.id === groupIndex) setSelectedItem(null);
      }
    };

    const groupDisplayName = group.order.length === 1 ? group.order[0].id : group.name;
    const selectedGroup = selectedItem?.type === ItemType.Group && selectedItem.id === groupIndex;

    return (
      <div key={group.order[0].id} className={classes.groupWrapper}>
        <div
          className={cn(classes.groupHeaderWrapper, {
            [classes.selected]: selectedGroup,
          })}
          data-testid={pageGroupAccordionHeader(groupIndex)}
        >
          <div
            className={classes.container}
            onClick={() => setSelectedItem({ type: ItemType.Group, id: groupIndex })}
          >
            <FolderIcon aria-hidden />
            <StudioHeading size='2xs' level={2}>
              {groupDisplayName}
            </StudioHeading>
          </div>
          <div className={classes.rightIconsContainer}>
            <StudioPopover.TriggerContext>
              <StudioPopover.Trigger variant='tertiary' className={classes.elipsisIcon}>
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
            <StudioDeleteButton
              title={t('general.delete_item', { item: groupDisplayName })}
              data-color='danger'
              icon={<TrashIcon />}
              onDelete={handleConfirmDelete}
              variant='tertiary'
              disabled={isPending}
            />
          </div>
        </div>
        {group.order.map((page) => {
          const layout = layouts?.[page.id];
          const isInvalidLayout = layout ? duplicatedIdsExistsInLayout(layout) : false;
          return (
            <Accordion key={page.id} className={classes.groupAccordionWrapper}>
              <PageAccordion
                pageName={page.id}
                isOpen={page.id === selectedFormLayoutName}
                onClick={() => onAccordionClick(page.id)}
                isInvalid={isInvalidLayout}
                hasDuplicatedIds={layoutsWithDuplicateComponents.duplicateLayouts.includes(page.id)}
                groupIndex={groupIndex}
              >
                {page.id === selectedFormLayoutName && layout && (
                  <FormLayout
                    layout={layout}
                    isInvalid={isInvalidLayout}
                    duplicateComponents={layoutsWithDuplicateComponents.duplicateComponents}
                  />
                )}
              </PageAccordion>
            </Accordion>
          );
        })}
        <StudioButton
          icon={<PlusIcon aria-hidden />}
          onClick={() => handleAddPageInsideGroup(groupIndex)}
          className={classes.addPagebutton}
          disabled={isAddPagePending}
        >
          {t('ux_editor.pages_add')}
        </StudioButton>
      </div>
    );
  });
};
