import React, { useRef, useState } from 'react';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { createNewTextResourceId, taskNavigationType } from '../Settings/SettingsUtils';
import { StudioButton, StudioDialog, StudioFieldset } from '@studio/components';
import { useTextResourceValue } from '../TextResource/hooks/useTextResourceValue';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations';
import { TextResourceEditor } from '../TextResource/TextResourceEditor';
import { CheckmarkIcon, PencilIcon, XMarkIcon } from '@studio/icons';
import classes from './EditNameAction.module.css';
import { defaultLangCode } from '@altinn/text-editor';
import { useTranslation } from 'react-i18next';

export type EditNameActionProps = {
  task: TaskNavigationGroup;
  tasks: TaskNavigationGroup[];
  index: number;
  handleUpdateTaskNavigationGroup: (updatedNavigationTasks: TaskNavigationGroup[]) => void;
};

export const EditNameAction = ({
  task,
  tasks,
  index,
  handleUpdateTaskNavigationGroup,
}: EditNameActionProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: upsertTextResource } = useUpsertTextResourceMutation(org, app);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const liveTextResourceValue = useTextResourceValue(task?.name);
  const originTextResourceValueRef = useRef<string | undefined>();
  originTextResourceValueRef.current ??= liveTextResourceValue;

  const [textResourceId, setTextResourceId] = useState<string>(
    task?.name ?? createNewTextResourceId(task),
  );
  const [currentValue, setCurrentValue] = useState(liveTextResourceValue);
  const taskTypeName = taskNavigationType(task.taskType);

  const handleTextResourceChange = () => {
    const updatedNavigationTasks = [...tasks];
    updatedNavigationTasks[index] = {
      ...updatedNavigationTasks[index],
      name: textResourceId,
    };
    handleUpdateTaskNavigationGroup(updatedNavigationTasks);
    dialogRef.current?.close();
    originTextResourceValueRef.current = currentValue;
  };

  const handleCancel = () => {
    const isValueChanged = currentValue !== originTextResourceValueRef.current;

    if (isValueChanged) {
      upsertTextResource({
        textId: textResourceId,
        language: defaultLangCode,
        translation: originTextResourceValueRef.current,
      });
    }

    originTextResourceValueRef.current = undefined;
    dialogRef.current?.close();
  };

  return (
    <StudioDialog.TriggerContext>
      <StudioDialog.Trigger
        icon={<PencilIcon />}
        variant='tertiary'
        className={classes.openDialogButton}
      >
        {t('ux_editor.task_table.menu_edit_name')}
      </StudioDialog.Trigger>
      <StudioDialog
        ref={dialogRef}
        closeButton={false}
        onKeyDown={(e) => e.key === 'Escape' && handleCancel()}
      >
        <StudioFieldset>
          <StudioFieldset.Legend>{t('ux_editor.task_table.menu_edit_name')}</StudioFieldset.Legend>
          <TextResourceEditor
            textResourceId={textResourceId}
            onReferenceChange={setTextResourceId}
            onSetCurrentValue={setCurrentValue}
            placeholderValue={t(taskTypeName)}
          />
          <div className={classes.buttonGroup}>
            <StudioButton
              variant='primary'
              onClick={handleTextResourceChange}
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
