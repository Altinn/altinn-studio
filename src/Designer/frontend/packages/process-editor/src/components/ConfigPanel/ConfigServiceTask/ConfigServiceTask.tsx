import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { ConfigContentContainer } from '../ConfigContent/ConfigContentContainer';
import classes from './ConfigServiceTask.module.css';
import { ConfigPdfServiceTask } from './ConfigPdfServiceTask';
import { EditTaskId } from '../ConfigContent/EditTaskId/EditTaskId';
import { StudioDisplayTile } from '@studio/components';

export const ConfigServiceTask = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const isPdfTask = bpmnDetails.taskType === 'pdf';

  return (
    <ConfigContentContainer>
      <div className={classes.configContent}>
        <EditTaskId />
        <StudioDisplayTile
          label={t('process_editor.configuration_panel_name_label')}
          value={bpmnDetails.name}
          className={classes.displayTile}
          showPadlock={false}
        />
        {isPdfTask && <ConfigPdfServiceTask />}
      </div>
    </ConfigContentContainer>
  );
};
