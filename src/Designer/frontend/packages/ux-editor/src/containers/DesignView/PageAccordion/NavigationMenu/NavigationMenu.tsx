import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  MenuElipsisVerticalIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FolderPlusIcon,
  FolderIcon,
} from 'libs/studio-icons/src';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../../hooks';
import { StudioDropdown } from 'libs/studio-components/src';
import { usePagesQuery } from '../../../../hooks/queries/usePagesQuery';
import { useChangePageOrderMutation } from '../../../../hooks/mutations/useChangePageOrderMutation';
import { useChangePageGroupOrder } from '@altinn/ux-editor/hooks/mutations/useChangePageGroupOrder';
import type { GroupModel } from 'app-shared/types/api/dto/PageModel';
import { PageGroupMoveToExistingGroupDialog } from '@altinn/ux-editor/components/Pages/PageGroupMoveDialog';
import { isPagesModelWithGroups } from 'app-shared/types/api/dto/PagesModel';
import classes from './NavigationMenu.module.css';

export type NavigationMenuProps = {
  pageName: string;
};

/**
 * @component
 *    Displays the buttons to move a page accordion up or down, edit the name and delete the page
 *
 * @property {string}[pageName] - The name of the page
 *
 * @returns {JSX.Element} - The rendered component
 */
export const NavigationMenu = ({ pageName }: NavigationMenuProps): JSX.Element => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { data: pagesModel } = usePagesQuery(org, app, selectedFormLayoutSetName);
  const { mutate: changePageOrder } = useChangePageOrderMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const [isMoveToGroupDialogOpen, setIsMoveToGroupDialogOpen] = React.useState(false);
  const { mutate: changePageGroups } = useChangePageGroupOrder(org, app, selectedFormLayoutSetName);

  const isUsingGroups = isPagesModelWithGroups(pagesModel);
  const groupModel =
    isUsingGroups &&
    pagesModel.groups?.find((group) => group.order.some((page) => page.id === pageName));
  const pageIndex = isUsingGroups
    ? groupModel?.order?.findIndex((page) => page.id === pageName)
    : pagesModel.pages?.findIndex((page) => page.id === pageName);
  const pageCount = isUsingGroups ? groupModel?.order?.length : pagesModel.pages?.length;
  const disableUp = pageIndex === 0;
  const disableDown = pageIndex === pageCount - 1;

  const moveLayoutUp = () => {
    if (isUsingGroups) {
      const updatedPagesModel = { ...pagesModel };
      updatedPagesModel.groups.map((group) => {
        if (group.order.some((page) => page.id === pageName)) {
          const page = group.order.splice(pageIndex, 1)[0];
          group.order.splice(pageIndex - 1, 0, page);
        }
      });
      changePageGroups(updatedPagesModel);
    } else {
      const page = pagesModel.pages?.splice(pageIndex, 1)[0];
      pagesModel.pages?.splice(pageIndex - 1, 0, page);
      changePageOrder(pagesModel);
    }
  };

  const moveLayoutDown = () => {
    if (isUsingGroups) {
      const updatedPagesModel = { ...pagesModel };
      updatedPagesModel.groups.map((group) => {
        if (group.order.some((page) => page.id === pageName)) {
          const page = group.order.splice(pageIndex, 1)[0];
          group.order.splice(pageIndex + 1, 0, page);
        }
      });
      changePageGroups(updatedPagesModel);
    } else {
      const page = pagesModel.pages?.splice(pageIndex, 1)[0];
      pagesModel.pages?.splice(pageIndex + 1, 0, page);
      changePageOrder(pagesModel);
    }
  };

  const movePageToNewGroup = () => {
    if (!isPagesModelWithGroups(pagesModel)) return;
    const newGroup: GroupModel = {
      order: [{ id: pageName }],
    };
    const updatedPagesModel = {
      ...pagesModel,
      groups: [
        ...pagesModel.groups.map((group) => ({
          ...group,
          order: group.order.filter((page) => page.id !== pageName),
        })),
        newGroup,
      ],
    };
    changePageGroups(updatedPagesModel);
  };

  return (
    <div>
      {isUsingGroups && (
        <PageGroupMoveToExistingGroupDialog
          pageName={pageName}
          open={isMoveToGroupDialogOpen}
          onClose={() => setIsMoveToGroupDialogOpen(false)}
        />
      )}
      <StudioDropdown
        icon={<MenuElipsisVerticalIcon className={classes.elipsisIcon} />}
        triggerButtonVariant='tertiary'
      >
        <StudioDropdown.List>
          <StudioDropdown.Item>
            <StudioDropdown.Button
              onClick={() => !disableUp && moveLayoutUp()}
              disabled={disableUp}
              id='move-page-up-button'
            >
              <ArrowUpIcon />
              {t('ux_editor.page_menu_up')}
            </StudioDropdown.Button>
          </StudioDropdown.Item>
          <StudioDropdown.Item>
            <StudioDropdown.Button
              onClick={() => !disableDown && moveLayoutDown()}
              disabled={disableDown}
              id='move-page-down-button'
            >
              <ArrowDownIcon />
              {t('ux_editor.page_menu_down')}
            </StudioDropdown.Button>
          </StudioDropdown.Item>
        </StudioDropdown.List>
        {isUsingGroups && (
          <>
            <StudioDropdown.Heading>
              {t('ux_editor.page_menu_group_movement_heading')}
            </StudioDropdown.Heading>
            <StudioDropdown.Item>
              <StudioDropdown.Button
                onClick={() => setIsMoveToGroupDialogOpen(true)}
                disabled={pagesModel.groups.length <= 1}
              >
                <FolderIcon />
                {t('ux_editor.page_menu_existing_group')}
              </StudioDropdown.Button>
            </StudioDropdown.Item>
            <StudioDropdown.Item>
              <StudioDropdown.Button onClick={movePageToNewGroup} disabled={pageCount <= 1}>
                <FolderPlusIcon />
                {t('ux_editor.page_menu_new_group')}
              </StudioDropdown.Button>
            </StudioDropdown.Item>
          </>
        )}
      </StudioDropdown>
    </div>
  );
};
