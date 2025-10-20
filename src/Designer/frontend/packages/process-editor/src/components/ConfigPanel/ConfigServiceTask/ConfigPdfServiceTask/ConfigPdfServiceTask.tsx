import React, { useState, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { StudioModeler } from '../../../../utils/bpmnModeler/StudioModeler';
import { Combobox, Label } from '@digdir/designsystemet-react';
import { StudioButton, StudioProperty, StudioToggleableTextfield } from '@studio/components';
import { LinkIcon, XMarkIcon } from '@studio/icons';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import classes from './ConfigPdfServiceTask.module.css';
import { useUpdatePdfConfigTaskIds } from '@altinn/process-editor/hooks/useUpdatePdfConfigTaskIds';

export const ConfigPdfServiceTask = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const taskIdsId = useId();
  const updateTaskIds = useUpdatePdfConfigTaskIds();

  const studioModeler = new StudioModeler();
  const allTasks = studioModeler.getAllTasksByType('bpmn:Task');
  const availableTasks = allTasks.map((task) => ({
    id: task.id,
    name: task.businessObject?.name || '',
  }));

  const pdfConfig = bpmnDetails.element.businessObject.extensionElements.values[0].pdfConfig;
  const currentTaskIds =
    (pdfConfig.autoPdfTaskIds?.taskIds as [{ value: string }])
      ?.filter((taskId) => availableTasks.map((task) => task.id).includes(taskId.value))
      .map((taskId) => taskId.value) || [];

  const [filename, setFilename] = useState<string>(pdfConfig.filename?.value);
  const [selectedTaskIds, setSelectedTaskIds] = useState(currentTaskIds);
  const [taskIdsSelectVisible, setTaskIdsSelectVisible] = useState(!selectedTaskIds.length);

  const selectedTasks = availableTasks.filter((task) => selectedTaskIds.includes(task.id));

  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  const bpmnFactory: BpmnFactory = modelerInstance.get('bpmnFactory');

  const handleFilenameBlur = () => {
    if (filename === pdfConfig.filename?.value) {
      return;
    }

    const filenameElement = filename
      ? bpmnFactory.create('altinn:Filename', {
          value: filename,
        })
      : null;

    modeling.updateModdleProperties(bpmnDetails.element, pdfConfig, {
      filename: filenameElement,
    });
  };

  const handleTaskIdsChange = (newTaskIds: string[]) => {
    setSelectedTaskIds(newTaskIds);
    updateTaskIds(newTaskIds);
  };

  return (
    <>
      <StudioToggleableTextfield
        label={t('process_editor.configuration_panel_change_pdf_service_task_filename')}
        title={t('process_editor.configuration_panel_change_pdf_service_task_filename')}
        value={filename}
        onBlur={handleFilenameBlur}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilename(e.target.value)}
      />

      {taskIdsSelectVisible ? (
        <div className={classes.taskIdSelectContainer}>
          <Label size='small' htmlFor={taskIdsId}>
            {t('process_editor.configuration_panel_set_auto_pdf_tasks')}
          </Label>
          <div className={classes.taskIdSelectAndButtons}>
            <Combobox
              id={taskIdsId}
              value={selectedTaskIds}
              size='small'
              className={classes.taskIdSelect}
              multiple
              onValueChange={handleTaskIdsChange}
            >
              <Combobox.Empty>
                {t('process_editor.configuration_panel_no_data_types_to_sign_to_select')}
              </Combobox.Empty>
              {availableTasks.map((task) => (
                <Combobox.Option key={task.id} value={task.id}>
                  {task.name} ({task.id})
                </Combobox.Option>
              ))}
            </Combobox>
            <StudioButton
              icon={<XMarkIcon />}
              onClick={() => setTaskIdsSelectVisible(false)}
              title={t('general.close')}
              variant='secondary'
            />
          </div>
        </div>
      ) : (
        <StudioProperty.Button
          onClick={() => setTaskIdsSelectVisible(true)}
          property={t('process_editor.configuration_panel_set_auto_pdf_tasks')}
          title={t('process_editor.configuration_panel_set_auto_pdf_tasks')}
          icon={<LinkIcon />}
          value={selectedTasks?.map((task) => (
            <div key={task.id}>
              {task.name} ({task.id})
            </div>
          ))}
        />
      )}
    </>
  );
};
