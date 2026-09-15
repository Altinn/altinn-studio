import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { ConfigContentContainer } from '../ConfigContent/ConfigContentContainer';
import classes from './ConfigServiceTask.module.css';
import { ConfigPdfServiceTask } from './ConfigPdfServiceTask';
import { EditTaskId } from '../ConfigContent/EditTaskId/EditTaskId';
import { StudioDetails } from '@studio/components';
import { EditTaskName } from '../ConfigContent/EditTaskName';
import { EditActions } from '../ConfigContent/EditActions';
import { EditPolicy } from '../ConfigContent/EditPolicy';
import { EditServiceTaskType } from './EditServiceTaskType';
import { IncompleteConfigAlert } from './IncompleteConfigAlert';

export const ConfigServiceTask = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  // The question is not whether the type is built in, but whether Studio has a panel of its own for
  // it. Pdf is the only one so far, so every other service task keeps the editable type field —
  // including one whose type is built in. Unmounting the field on the value the user just typed
  // would strand them in a panel with no way back.
  const isPdfTask = bpmnDetails.taskType === 'pdf';

  return (
    <ConfigContentContainer>
      <div className={classes.configContent}>
        <EditTaskId />
        <EditTaskName />
        <IncompleteConfigAlert />
        {!isPdfTask && <EditServiceTaskType />}
        {isPdfTask && <ConfigPdfServiceTask />}
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
