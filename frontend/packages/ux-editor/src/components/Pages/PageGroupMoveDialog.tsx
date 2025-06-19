import { useAppContext } from '@altinn/ux-editor/hooks';
import { usePagesQuery } from '@altinn/ux-editor/hooks/queries/usePagesQuery';
import { usePageGroupName } from '@altinn/ux-editor/hooks/usePageGroupName';
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
  const pageGroupName = usePageGroupName();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { data: pagesModel } = usePagesQuery(org, app, selectedFormLayoutSetName);

  const otherGroups = pagesModel.groups.filter((group) =>
    group.order.some((page) => page.id !== pageName),
  );

  return (
    <StudioDialog open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <StudioHeading>{t('ux_editor.page_group_move_dialog.select_group')}</StudioHeading>
        <StudioParagraph>{t('ux_editor.page_group_move_dialog.description')}</StudioParagraph>
        <StudioSelect label={t('ux_editor.page_group_move_dialog.select_group_label')}>
          {otherGroups.map((group) => (
            <StudioSelect.Option key={group.name} value={group.name}>
              {pageGroupName(group)}
            </StudioSelect.Option>
          ))}
        </StudioSelect>
        <div style={{ display: 'flex', gap: 13 }}>
          <StudioButton icon={<StudioSaveIcon />} variant='primary' onClick={() => {}}>
            {t('general.save')}
          </StudioButton>
          <StudioButton icon={<StudioCancelIcon />} variant='secondary' onClick={onClose}>
            {t('general.cancel')}
          </StudioButton>
        </div>
      </div>
    </StudioDialog>
  );
};
