import React from 'react';
import classes from './ConfigContent.module.css';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { EditTaskId } from './EditTaskId/EditTaskId';
import { StudioDisplayTile, StudioSectionHeader } from '@studio/components';
import { getConfigTitleKey, getConfigTitleHelpTextKey } from '../../../utils/configPanelUtils';
import { ConfigIcon } from './ConfigIcon';
import { EditDataType } from '../EditDataType';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';
import { Accordion } from '@digdir/design-system-react';
import { EditActions } from './EditActions';

export const ConfigContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const { layoutSets, availableDataModelIds } = useBpmnApiContext();
  const configHeaderTexts: Record<'title' | 'helpText', string> = {
    title: bpmnDetails?.taskType && t(getConfigTitleKey(bpmnDetails.taskType)),
    helpText: bpmnDetails?.taskType && t(getConfigTitleHelpTextKey(bpmnDetails.taskType)),
  };
  const layoutSet = layoutSets?.sets.find((set) => set.tasks.includes(bpmnDetails.id));
  const existingDataTypeForTask = layoutSet?.dataType;
  const datamodelIds = availableDataModelIds
    ? [...availableDataModelIds, ...(existingDataTypeForTask ? [existingDataTypeForTask] : [])]
    : [];

  const taskHasConnectedLayoutSet = layoutSets?.sets?.some((set) => set.tasks[0] == bpmnDetails.id);

  return (
    <div className={classes.configContent}>
      <StudioSectionHeader
        icon={<ConfigIcon taskType={bpmnDetails.taskType} />}
        heading={{
          text: configHeaderTexts.title,
          level: 2,
        }}
        helpText={{
          text: configHeaderTexts.helpText,
          title: t('process_editor.configuration_panel_header_help_text_title'),
        }}
      />
      <EditTaskId />
      <StudioDisplayTile
        label={t('process_editor.configuration_panel_name_label')}
        value={bpmnDetails.name}
        className={classes.displayTile}
      />
      {taskHasConnectedLayoutSet && (
        <EditDataType
          connectedTaskId={layoutSet.tasks[0]}
          datamodelIds={datamodelIds}
          existingDataTypeForTask={existingDataTypeForTask}
        />
      )}
      <Accordion color='neutral'>
        <Accordion.Item>
          <Accordion.Header>
            {t('process_editor.configuration_panel_actions_title')}
          </Accordion.Header>
          <Accordion.Content className={classes.accordion}>
            <EditActions />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};
