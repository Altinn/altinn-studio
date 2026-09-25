import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { ConfigContentContainer } from '../ConfigContent/ConfigContentContainer';
import classes from './ConfigServiceTask.module.css';
import { ConfigEFormidlingServiceTask } from './ConfigEFormidlingServiceTask';
import { ConfigPdfServiceTask } from './ConfigPdfServiceTask';
import { FiksArkivProcessShapeAlert } from './FiksArkivProcessShapeAlert';
import { EditTaskId } from '../ConfigContent/EditTaskId/EditTaskId';
import { StudioDetails } from '@studio/components';
import { EditTaskName } from '../ConfigContent/EditTaskName';
import { EditActions } from '../ConfigContent/EditActions';
import { EditPolicy } from '../ConfigContent/EditPolicy';
import { EditServiceTaskType } from './EditServiceTaskType';

export const ConfigServiceTask = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const isPdfTask = bpmnDetails.taskType === 'pdf';
  const isSubformPdfTask = bpmnDetails.taskType === 'subformPdf';
  const isEFormidlingTask = bpmnDetails.taskType === 'eFormidling';
  const isFiksArkivTask = bpmnDetails.taskType === 'fiksArkiv';
  const isCustomTask = !isPdfTask && !isSubformPdfTask && !isEFormidlingTask && !isFiksArkivTask;

  return (
    <ConfigContentContainer>
      <div className={classes.configContent}>
        {isFiksArkivTask && <FiksArkivProcessShapeAlert />}
        <EditTaskId />
        <EditTaskName />
        {isCustomTask && <EditServiceTaskType />}
        {isPdfTask && <ConfigPdfServiceTask />}
        {isEFormidlingTask && <ConfigEFormidlingServiceTask />}
        <div>
          <StudioDetails>
            <StudioDetails.Summary>
              {t('process_editor.configuration_panel_actions_title')}
            </StudioDetails.Summary>
            <StudioDetails.Content className={classes.detailsContent}>
              <EditActions />
            </StudioDetails.Content>
          </StudioDetails>
          <StudioDetails>
            <StudioDetails.Summary>
              {t('process_editor.configuration_panel_policy_title')}
            </StudioDetails.Summary>
            <StudioDetails.Content className={classes.detailsContent}>
              <EditPolicy />
            </StudioDetails.Content>
          </StudioDetails>
        </div>
      </div>
    </ConfigContentContainer>
  );
};
