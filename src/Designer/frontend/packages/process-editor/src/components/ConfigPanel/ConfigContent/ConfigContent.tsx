import React from 'react';
import classes from './ConfigContent.module.css';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { EditTaskId } from './EditTaskId/EditTaskId';
import {
  StudioDisplayTile,
  useStudioRecommendedNextActionContext,
} from '@studio/components-legacy';
import { EditDataTypes } from './EditDataTypes';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';
import { Accordion } from '@digdir/designsystemet-react';
import { EditActions } from './EditActions';
import { EditPolicy } from './EditPolicy';
import { EditDataTypesToSign } from './EditDataTypesToSign';
import { EditUniqueFromSignaturesInDataTypes } from './EditUniqueFromSignaturesInDataTypes';
import { StudioModeler } from '../../../utils/bpmnModeler/StudioModeler';
import { RecommendedActionChangeName } from './EditLayoutSetNameRecommendedAction/RecommendedActionChangeName';
import { ConfigContentContainer } from './ConfigContentContainer';
import { EditLayoutSetName } from './EditLayoutSetName';
import { EditUserControlledImplementation } from './EditUserControlledImplementation';
import { EditCorrespondenceResource } from './EditCorrespondenceResource';
import { TaskUtils } from '../../../utils/taskUtils';

export const ConfigContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const { layoutSets, availableDataModelIds } = useBpmnApiContext();
  const layoutSet = layoutSets?.sets.find((set) => set.tasks?.includes(bpmnDetails.id));
  const existingDataTypeForTask = layoutSet?.dataType;
  const isSigningTask = bpmnDetails.taskType === 'signing';
  const isUserControlledSigningTask = bpmnDetails.taskType === 'userControlledSigning';
  const shouldDisplayEditDataTypesToSign = isSigningTask || isUserControlledSigningTask;

  const taskHasConnectedLayoutSet = layoutSets?.sets?.some(
    (set) => set.tasks && set.tasks[0] == bpmnDetails.id,
  );
  const { shouldDisplayAction } = useStudioRecommendedNextActionContext();

  const studioModeler = new StudioModeler();
  const tasks = studioModeler.getAllTasksByType('bpmn:Task');
  const isFirstSigningTask = tasks
    .filter((item) =>
      TaskUtils.isSigningTask(item.businessObject.extensionElements?.values[0]?.taskType),
    )
    .some((item, index) => item.id === bpmnDetails.id && index === 0);

  if (shouldDisplayAction(bpmnDetails.id)) {
    return (
      <ConfigContentContainer className={classes.recommendedActionBackdrop}>
        <div className={classes.recommendedActionContentBackdrop}>
          <RecommendedActionChangeName />
        </div>
      </ConfigContentContainer>
    );
  }

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
        {shouldDisplayEditDataTypesToSign && (
          <>
            <EditDataTypesToSign key={`${bpmnDetails.id}-dataTypes`} />
            {!isFirstSigningTask && (
              <EditUniqueFromSignaturesInDataTypes key={`${bpmnDetails.id}-uniqueSignature`} />
            )}
          </>
        )}
        {isUserControlledSigningTask && (
          <>
            <EditUserControlledImplementation key={`${bpmnDetails.id}-interfaceImplementation`} />
            <EditCorrespondenceResource key={`${bpmnDetails.id}-correspondenceResource`} />
          </>
        )}
        <Accordion color='neutral'>
          {taskHasConnectedLayoutSet && (
            <Accordion.Item>
              <Accordion.Header>
                {t('process_editor.configuration_panel_design_title')}
              </Accordion.Header>
              <Accordion.Content className={classes.accordion}>
                <EditLayoutSetName existingLayoutSetName={layoutSet.id} />
                <EditDataTypes
                  connectedTaskId={layoutSet.tasks[0]}
                  dataModelIds={availableDataModelIds}
                  existingDataTypeForTask={existingDataTypeForTask}
                />
              </Accordion.Content>
            </Accordion.Item>
          )}
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
