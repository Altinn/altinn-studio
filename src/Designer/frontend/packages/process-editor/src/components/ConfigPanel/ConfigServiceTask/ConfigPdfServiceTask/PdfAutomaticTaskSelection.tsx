import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Combobox } from '@digdir/designsystemet-react';
import { StudioModeler } from '../../../../utils/bpmnModeler/StudioModeler';
import { useUpdatePdfConfigTaskIds } from '../../../../hooks/useUpdatePdfConfigTaskIds';
import { usePdfConfig } from './usePdfConfig';
import { filterCurrentTaskIds, getAvailableTasks } from './utils';
import classes from './ConfigPdfServiceTask.module.css';

export const PdfAutomaticTaskSelection = (): React.ReactElement => {
  const { t } = useTranslation();
  const taskIdsId = useId();
  const updateTaskIds = useUpdatePdfConfigTaskIds();
  const { pdfConfig } = usePdfConfig();

  const studioModeler = new StudioModeler();
  const allTasks = studioModeler.getAllTasksByType('bpmn:Task');
  const availableTasks = getAvailableTasks(allTasks);
  const availableTaskIds = availableTasks.map((task) => task.id);

  const currentTaskIds = filterCurrentTaskIds(pdfConfig, availableTaskIds);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(currentTaskIds);

  const handleTaskIdsChange = (newTaskIds: string[]): void => {
    setSelectedTaskIds(newTaskIds);
    updateTaskIds(newTaskIds);
  };

  return (
    <div className={classes.taskIdSelectContainer}>
      <div className={classes.taskIdSelectAndButtons}>
        <Combobox
          id={taskIdsId}
          value={selectedTaskIds}
          size='small'
          className={classes.taskIdSelect}
          multiple
          onValueChange={handleTaskIdsChange}
          placeholder={t('process_editor.configuration_panel_select_tasks_placeholder')}
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
      </div>
    </div>
  );
};
