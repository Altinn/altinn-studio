import React, { useState } from 'react';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { createNewTextResourceId, taskNavigationType } from '../Settings/SettingsUtils';
import { StudioButton, StudioDialog, StudioFieldset } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations';
import { TextResourceEditor } from '../TextResource/TextResourceEditor';
import { CheckmarkIcon, PencilIcon, XMarkIcon } from '@studio/icons';
import classes from './EditNameAction.module.css';
import { defaultLangCode } from '@altinn/text-editor';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { textResourceByLanguageAndIdSelector } from '@altinn/ux-editor/selectors/textResourceSelectors';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';

export type EditNameActionProps = {
  task: TaskNavigationGroup;
  tasks: TaskNavigationGroup[];
  index: number;
  handleUpdateTaskNavigationGroup: (updatedNavigationTasks: TaskNavigationGroup[]) => void;
  setPopoverOpen: (shouldOpen: boolean) => void;
};

export const EditNameAction = ({
  task,
  tasks,
  index,
  handleUpdateTaskNavigationGroup,
  setPopoverOpen,
}: EditNameActionProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: upsertTextResource } = useUpsertTextResourceMutation(org, app);
  const { data: textResources } = useTextResourcesQuery(org, app);

  const getResolvedTaskName = (id: string) => {
    const resource = textResourceByLanguageAndIdSelector(DEFAULT_LANGUAGE, id)(textResources);
    return resource?.value || t(taskNavigationType(task.taskType));
  };

  const [textResourceId, setTextResourceId] = useState<string>(
    task?.name ?? createNewTextResourceId(task),
  );
  const taskName = getResolvedTaskName(task?.name);
  const [currentValue, setCurrentValue] = useState(taskName);
  const [openDialog, setOpenDialog] = useState(false);

  const handleSaveTextResource = () => {
    const updatedNavigationTasks = [...tasks];
    updatedNavigationTasks[index] = {
      ...updatedNavigationTasks[index],
      name: textResourceId,
    };
    handleUpdateTaskNavigationGroup(updatedNavigationTasks);
    upsertTextResource({
      textId: textResourceId,
      language: defaultLangCode,
      translation: currentValue,
    });
    setOpenDialog(false);
  };

  const handleCancel = () => {
    setPopoverOpen(false);
    setOpenDialog(false);
  };

  const handleReferenceChange = (id: string) => {
    setTextResourceId(id);
    setCurrentValue(getResolvedTaskName(id));
  };

  return (
    <StudioDialog.TriggerContext>
      <StudioDialog.Trigger
        onClick={() => setOpenDialog(true)}
        icon={<PencilIcon />}
        variant='tertiary'
        className={classes.openDialogButton}
      >
        {t('ux_editor.task_table.menu_edit_name')}
      </StudioDialog.Trigger>
      <StudioDialog
        closeButton={false}
        open={openDialog}
        onKeyDown={(e) => e.key === 'Escape' && handleCancel()}
      >
        <StudioFieldset>
          <StudioFieldset.Legend>{t('ux_editor.task_table.menu_edit_name')}</StudioFieldset.Legend>
          <TextResourceEditor
            textResourceId={textResourceId}
            onReferenceChange={handleReferenceChange}
            onSetCurrentValue={setCurrentValue}
            textResourceValue={currentValue}
          />
          <div className={classes.buttonGroup}>
            <StudioButton
              variant='primary'
              onClick={handleSaveTextResource}
              icon={<CheckmarkIcon />}
            >
              {t('general.save')}
            </StudioButton>
            <StudioButton variant='secondary' onClick={handleCancel} icon={<XMarkIcon />}>
              {t('general.cancel')}
            </StudioButton>
          </div>
        </StudioFieldset>
      </StudioDialog>
    </StudioDialog.TriggerContext>
  );
};
