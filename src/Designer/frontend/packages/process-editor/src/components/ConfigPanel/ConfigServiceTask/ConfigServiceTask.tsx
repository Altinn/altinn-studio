import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { ConfigContentContainer } from '../ConfigContent/ConfigContentContainer';
import classes from './ConfigServiceTask.module.css';
import { ConfigPdfServiceTask } from './ConfigPdfServiceTask';
import { EditTaskId } from '../ConfigContent/EditTaskId/EditTaskId';
import { StudioDisplayTile } from '@studio/components';
import { Accordion } from '@digdir/designsystemet-react';
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
        <Accordion color='neutral'>
          <Accordion.Item>
            <Accordion.Header>
              {t('process_editor.configuration_panel_actions_title')}
            </Accordion.Header>
            <Accordion.Content className={classes.accordion}>
              <EditActions />
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              {t('process_editor.configuration_panel_policy_title')}
            </Accordion.Header>
            <Accordion.Content className={classes.accordion}>
              <EditPolicy />
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>
    </ConfigContentContainer>
  );
};
