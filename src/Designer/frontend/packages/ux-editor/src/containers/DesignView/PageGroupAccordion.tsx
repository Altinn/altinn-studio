import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import classes from './PageGroupAccordion.module.css';
import { useTranslation } from 'react-i18next';
import { PageAccordion } from './PageAccordion';
import { FormLayout } from './FormLayout';
import {
  StudioAlert,
  StudioButton,
  StudioPopover,
  StudioHeading,
  StudioDeleteButton,
} from '@studio/components';
import {
  MenuElipsisVerticalIcon,
  FolderIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@studio/icons';
import type { IFormLayouts } from '@altinn/ux-editor/types/global';
import {
  duplicatedIdsExistsInLayout,
  findLayoutsContainingDuplicateComponents,
} from '@altinn/ux-editor/utils/formLayoutUtils';
import type { PagesModelWithPageGroups } from 'app-shared/types/api/dto/PagesModel';
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
import { pageGroupDisplayName } from '@altinn/ux-editor/utils/pageGroupUtils';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

export interface PageGroupAccordionProps {
  pages: PagesModelWithPageGroups;
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
  const { selectedItem, setSelectedItem, setSelectedFormLayoutName } = useAppContext();
  const { layoutSet } = useUxEditorParams();

  const { org, app } = useStudioEnvironmentParams();
  const { mutate: changePageGroupOrder } = useChangePageGroupOrder(org, app, layoutSet);
  const { mutate: deletePageGroup, isPending } = useDeletePageGroupMutation(org, app, layoutSet);

  const { data: pagesModel } = usePagesQuery(org, app, layoutSet);
  const { addPageToGroup: handleAddPageInsideGroup } = useAddPageToGroup(
    pagesModel as PagesModelWithPageGroups,
  );

  const moveGroupUp = (groupIndex: number) => {
    const newGroups = [...pages.groups];
    const moveGroup = newGroups.splice(groupIndex, 1);
    newGroups.splice(groupIndex - 1, 0, ...moveGroup);
    changePageGroupOrder({ groups: newGroups });
  };

  const moveGroupDown = (groupIndex: number) => {
    const newGroups = [...pages.groups];
    const moveGroup = newGroups.splice(groupIndex, 1);
    newGroups.splice(groupIndex + 1, 0, ...moveGroup);
    changePageGroupOrder({ groups: newGroups });
  };

  const handleSelectGroup = (groupIndex: number) => {
    setSelectedItem({ type: ItemType.Group, id: groupIndex });
    setSelectedFormLayoutName(undefined);
  };

  return pages?.groups.map((group, groupIndex) => {
    if (!group.order || group.order.length === 0) return null;

    const handleConfirmDelete = () => {
      if (confirm(t('ux_editor.component_group_navigation_deletion_text'))) {
        const updatedGroups = {
          ...pages,
          groups: pages.groups.filter((_, i) => i !== groupIndex),
        };
        deletePageGroup(updatedGroups);
        if (selectedItem?.id === groupIndex) setSelectedItem(null);
      }
    };

    const groupDisplayName = pageGroupDisplayName(group);
    const { type, id } = selectedItem ?? {};

    const isGroupOrPageSelected =
      (type === ItemType.Group && id === groupIndex) ||
      group.order.some((page) => page.id === id || page.id === selectedFormLayoutName);

    return (
      <div
        key={group.order[0].id}
        className={cn(classes.groupWrapper, { [classes.selected]: isGroupOrPageSelected })}
      >
        <div
          className={classes.groupHeaderWrapper}
          data-testid={pageGroupAccordionHeader(groupIndex)}
        >
          <div className={classes.container} onClick={() => handleSelectGroup(groupIndex)}>
            <FolderIcon aria-hidden />
            <StudioHeading level={2}>{groupDisplayName}</StudioHeading>
          </div>
          <div className={classes.rightIconsContainer}>
            <StudioPopover.TriggerContext>
              <StudioPopover.Trigger variant='tertiary' className={classes.elipsisIcon}>
                <MenuElipsisVerticalIcon />
              </StudioPopover.Trigger>
              <StudioPopover placement='bottom'>
                <div className={classes.ellipsisMenuContent}>
                  <StudioButton
                    icon={<ArrowUpIcon aria-hidden />}
                    variant='tertiary'
                    onClick={() => moveGroupUp(groupIndex)}
                    disabled={groupIndex === 0}
                  >
                    {t('ux_editor.page_menu_up')}
                  </StudioButton>
                  <StudioButton
                    icon={<ArrowDownIcon aria-hidden />}
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
              data-size='2xs'
              disabled={isPending}
            />
          </div>
        </div>
        {group.order.map((page) => {
          const layout = layouts?.[page.id];
          const isInvalidLayout = layout ? duplicatedIdsExistsInLayout(layout) : false;
          return (
            <Accordion key={page.id} className={classes.groupPageAccordionWrapper}>
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
        {group.order.length === 1 && (
          <StudioAlert data-color='info' className={classes.alertMessage}>
            {t('ux_editor.page_group.one_page_in_group_info_message')}
          </StudioAlert>
        )}
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
