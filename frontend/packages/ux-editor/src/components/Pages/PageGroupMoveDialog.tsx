import React, { useState } from 'react';
import { useAppContext } from '../../hooks';
import { usePagesQuery } from '../../hooks/queries/usePagesQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  StudioHeading,
  StudioParagraph,
  StudioButton,
  StudioDialog,
  StudioSelect,
} from '@studio/components';
import { StudioSaveIcon, StudioCancelIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { useChangePageGroupOrder } from '../../hooks/mutations/useChangePageGroupOrder';
import {
  movePageToGroup,
  pageGroupDisplayName,
  removeEmptyGroups,
  updateGroupNames,
} from '../../utils/pageGroupUtils';
import { isPagesModelWithGroups } from 'app-shared/types/api/dto/PagesModel';

type PageGroupMoveToExistingGroupDialogProps = {
  pageName: string;
  open: boolean;
  onClose: () => void;
};

export const PageGroupMoveToExistingGroupDialog = ({
  pageName,
  open,
  onClose,
}: PageGroupMoveToExistingGroupDialogProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { data: pagesModel } = usePagesQuery(org, app, selectedFormLayoutSetName);
  const { mutate: changePages, isPending: mutationPending } = useChangePageGroupOrder(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const isGroupLayout = isPagesModelWithGroups(pagesModel);
  const currentGroupIndex =
    isGroupLayout &&
    pagesModel.groups.findIndex((group) => group.order.some((page) => page.id === pageName));
  const defaultSelectedGroup = currentGroupIndex === 0 ? 1 : 0;
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(defaultSelectedGroup);

  if (!isGroupLayout) return null;

  const moveToGroup = () => {
    const newGroups = updateGroupNames(
      removeEmptyGroups(movePageToGroup(pagesModel.groups, pageName, selectedGroupIndex)),
    );
    changePages(
      { ...pagesModel, groups: newGroups },
      {
        onSuccess: onClose,
      },
    );
  };

  return (
    <StudioDialog open={open} onClose={onClose} closeButton={false}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <StudioHeading>{t('ux_editor.page_group_move_dialog.select_group')}</StudioHeading>
        <StudioParagraph>{t('ux_editor.page_group_move_dialog.description')}</StudioParagraph>
        <StudioSelect
          label={t('ux_editor.page_group_move_dialog.select_group_label')}
          value={selectedGroupIndex}
          onChange={(e) => setSelectedGroupIndex(parseInt(e.target.value))}
        >
          {pagesModel.groups.map((group, index) => (
            <StudioSelect.Option key={index} value={index} disabled={currentGroupIndex === index}>
              {pageGroupDisplayName(group)}
            </StudioSelect.Option>
          ))}
        </StudioSelect>
        <div style={{ display: 'flex', gap: 13 }}>
          <StudioButton
            icon={<StudioSaveIcon />}
            variant='primary'
            onClick={moveToGroup}
            disabled={currentGroupIndex === selectedGroupIndex || mutationPending}
          >
            {t('general.save')}
          </StudioButton>
          <StudioButton
            icon={<StudioCancelIcon />}
            variant='secondary'
            onClick={onClose}
            disabled={mutationPending}
          >
            {t('general.cancel')}
          </StudioButton>
        </div>
      </div>
    </StudioDialog>
  );
};
