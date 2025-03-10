import React from 'react';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import { StudioIconCard } from '@studio/components/src/components/StudioIconCard/StudioIconCard';
import { getLayoutSetTypeTranslationKey } from 'app-shared/utils/layoutSetsUtils';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioDeleteButton, StudioParagraph } from '@studio/components';
import { useLayoutSetIcon } from '../../hooks/useLayoutSetIcon';
import { useDeleteLayoutSetMutation } from 'app-development/hooks/mutations/useDeleteLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

type TaskCardProps = {
  layoutSetModel: LayoutSetModel;
};

export const TaskCard = ({ layoutSetModel }: TaskCardProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: deleteLayoutSet } = useDeleteLayoutSetMutation(org, app);

  const taskName = getLayoutSetTypeTranslationKey(layoutSetModel);
  const taskIcon = useLayoutSetIcon(layoutSetModel);

  const contextButtons = layoutSetModel.type === 'subform' && (
    <StudioDeleteButton
      variant='tertiary'
      confirmMessage={t('ux_editor.delete.subform.confirm')}
      onDelete={() => {
        deleteLayoutSet({ layoutSetIdToUpdate: layoutSetModel.id });
      }}
    >
      {t('general.delete')}
    </StudioDeleteButton>
  );

  return (
    <StudioIconCard
      icon={taskIcon.icon}
      iconColor={taskIcon.iconColor}
      header={t(taskName)}
      contextButtons={contextButtons}
    >
      <StudioParagraph size='sm'>{layoutSetModel.id}</StudioParagraph>
      <StudioParagraph size='sm'>
        {t('ux_editor.task_card.datamodel')}
        {layoutSetModel.dataType && ' ' + layoutSetModel.dataType}
      </StudioParagraph>
      <StudioButton color='second' variant='primary'>
        {t('ux_editor.task_card.ux_editor')}
      </StudioButton>
    </StudioIconCard>
  );
};
