import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { ConfigContentContainer } from '../ConfigContent/ConfigContentContainer';
import classes from './ConfigServiceTask.module.css';
import { ConfigPdfServiceTask } from './ConfigPdfServiceTask';
import { EditTaskId } from '../ConfigContent/EditTaskId/EditTaskId';
import { StudioDetails, StudioDisplayTile } from '@studio/components';
import { EditActions } from '../ConfigContent/EditActions';
import { EditPolicy } from '../ConfigContent/EditPolicy';

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
