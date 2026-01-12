import React, { useState } from 'react';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { createNewTextResourceId, taskNavigationType } from '../Settings/SettingsUtils';
import type { StudioTextResourceEditorTexts } from '@studio/components';
import {
  StudioButton,
  StudioDialog,
  StudioFieldset,
  StudioTextResourceEditor,
} from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations';
import { CheckmarkIcon, PencilIcon, XMarkIcon } from '@studio/icons';
import classes from './EditNameAction.module.css';
import { defaultLangCode } from '@altinn/text-editor';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import {
  textResourceByLanguageAndIdSelector,
  textResourcesByLanguageSelector,
} from 'app-shared/selectors/textResourceSelectors';
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

  const defaultLanguageTextResources =
    textResourcesByLanguageSelector(DEFAULT_LANGUAGE)(textResources);

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

  const handleReferenceChange = (id?: string) => {
    setTextResourceId(id ?? '');
    setCurrentValue(getResolvedTaskName(id ?? ''));
  };

  const handleTextChange = (value: string) => setCurrentValue(value);

  const editorTexts: StudioTextResourceEditorTexts = {
    pickerLabel: t('ux_editor.search_text_resources_label'),
    valueEditorAriaLabel: t('ux_editor.text_resource_binding_text'),
    valueEditorIdLabel: t('ux_editor.text_resource_binding_id'),
    noTextResourceOptionLabel: t('ux_editor.search_text_resources_none'),
    disabledSearchAlertText: t(
      'ux_editor.modal_properties_textResourceBindings_page_name_search_disabled',
    ),
    tabLabelType: t('ux_editor.text_resource_binding_write'),
    tabLabelSearch: t('ux_editor.text_resource_binding_search'),
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
        <StudioFieldset legend={t('ux_editor.task_table.menu_edit_name')}>
          <StudioTextResourceEditor
            textResourceId={textResourceId}
            onReferenceChange={handleReferenceChange}
            onTextChange={handleTextChange}
            textResourceValue={currentValue}
            texts={editorTexts}
            textResources={defaultLanguageTextResources}
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
