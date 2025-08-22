import React from 'react';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StudioActionCard } from '@studio/components';

export const AddNewTask = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleAddTask = () =>
    navigate(`../${RoutePaths.ProcessEditor}?returnTo=${RoutePaths.UIEditor}`);

  return (
    <StudioActionCard onAction={handleAddTask} label={t('ux_editor.task_card_add_new_task')} />
  );
};
