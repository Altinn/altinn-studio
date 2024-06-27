import React from 'react';
import classes from './ConfigContent.module.css';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { EditTaskId } from './EditTaskId/EditTaskId';
import { StudioDisplayTile, StudioSectionHeader } from '@studio/components';
import { getConfigTitleKey, getConfigTitleHelpTextKey } from '../../../utils/configPanelUtils';
import { ConfigIcon } from './ConfigIcon';
import { EditDataTypes } from '../EditDataTypes';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';
import { Accordion } from '@digdir/design-system-react';
import { EditActions } from './EditActions';
import { EditPolicy } from './EditPolicy';
import { EditDataTypesToSign } from '../EditDataTypesToSign';
import { EditUniqueFromSignaturesInDataTypes } from '../EditUniqueFromSignaturesInDataTypes';
import { StudioModeler } from '@altinn/process-editor/utils/bpmn/StudioModeler';

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

  const taskHasConnectedLayoutSet = layoutSets?.sets?.some((set) => set.tasks[0] == bpmnDetails.id);

  const studioModeler = new StudioModeler();
  const tasks = studioModeler.getAllTasksByType('bpmn:Task');
  const isFirstSigningTask = tasks
    .filter((item) => item.businessObject.extensionElements?.values[0]?.taskType === 'signing')
    .some((item, index) => item.id === bpmnDetails.id && index === 0);

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
        showPadlock={false}
      />
      {taskHasConnectedLayoutSet && (
        <EditDataTypes
          connectedTaskId={layoutSet.tasks[0]}
          dataModelIds={availableDataModelIds}
          existingDataTypeForTask={existingDataTypeForTask}
        />
      )}
      {bpmnDetails.taskType === 'signing' && (
        <EditDataTypesToSign key={`${bpmnDetails.id}-dataTypes`} />
      )}
      {bpmnDetails.taskType === 'signing' && !isFirstSigningTask && (
        <EditUniqueFromSignaturesInDataTypes key={`${bpmnDetails.id}-uniqueSignature`} />
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
  );
};
