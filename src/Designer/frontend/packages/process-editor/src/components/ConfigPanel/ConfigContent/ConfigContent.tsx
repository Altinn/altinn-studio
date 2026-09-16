import React from 'react';
import classes from './ConfigContent.module.css';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { EditTaskId } from './EditTaskId/EditTaskId';
import { EditTaskName } from './EditTaskName';
import { StudioDetails, useStudioRecommendedNextActionContext } from '@studio/components';
import { EditDataTypes } from './EditDataTypes';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';
import { EditActions } from './EditActions';
import { EditPolicy } from './EditPolicy';
import { EditDataTypesToSign } from './EditDataTypesToSign';
import { EditUniqueFromSignaturesInDataTypes } from './EditUniqueFromSignaturesInDataTypes';
import { EditRunDefaultValidator } from './EditRunDefaultValidator';
import { StudioModeler } from '../../../utils/bpmnModeler/StudioModeler';
import { RecommendedActionChangeName } from './EditLayoutSetNameRecommendedAction/RecommendedActionChangeName';
import { ConfigContentContainer } from './ConfigContentContainer';
import { getTaskIdForLayoutSet } from 'app-shared/utils/layoutSetsUtils';
import { useCurrentLayoutSet } from '../../../hooks/useCurrentLayoutSet';
import { EditLayoutSetName } from './EditLayoutSetName';
import { EditUserControlledImplementation } from './EditUserControlledImplementation';
import { EditCorrespondenceResource } from './EditCorrespondenceResource';
import { TaskUtils } from '../../../utils/taskUtils';
import { MainSettingsHeader } from 'app-shared/components/MainSettingsHeader/MainSettingsHeader';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';

export const ConfigContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const { availableDataModelIds } = useBpmnApiContext();
  const { currentLayoutSet: layoutSet } = useCurrentLayoutSet();
  const existingDataTypeForTask = layoutSet?.dataType;
  const isSigningTask = bpmnDetails.taskType === 'signing';
  const isUserControlledSigningTask = TaskUtils.isUserControlledSigning(bpmnDetails.element);
  const shouldDisplayEditDataTypesToSign = isSigningTask || isUserControlledSigningTask;

  const taskHasConnectedLayoutSet = Boolean(layoutSet);
  const { shouldDisplayAction } = useStudioRecommendedNextActionContext();

  const studioModeler = new StudioModeler();
  const tasks = studioModeler.getElementsByType(BpmnTypeEnum.Task);
  const isFirstSigningTask = tasks
    .filter((item) => TaskUtils.isSigningTask(TaskUtils.getTaskExtension(item)?.taskType))
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
    <ConfigContentContainer className={classes.sectionHeader}>
      <div className={classes.configContent}>
        <MainSettingsHeader />
        <EditTaskId />
        {taskHasConnectedLayoutSet && (
          <EditDataTypes
            connectedTaskId={getTaskIdForLayoutSet(layoutSet)}
            dataModelIds={availableDataModelIds}
            existingDataTypeForTask={existingDataTypeForTask}
          />
        )}
        <EditTaskName />
        {shouldDisplayEditDataTypesToSign && (
          <>
            <EditDataTypesToSign key={`${bpmnDetails.id}-dataTypes`} />
            {!isFirstSigningTask && (
              <EditUniqueFromSignaturesInDataTypes key={`${bpmnDetails.id}-uniqueSignature`} />
            )}
            {/* The runtime runs the default validator only when the task type is literally
                `signing` (`SigningTaskValidator.ShouldRunForTask`), which is also what the palette
                writes for both kinds of signing task. */}
            {isSigningTask && (
              <EditRunDefaultValidator key={`${bpmnDetails.id}-runDefaultValidator`} />
            )}
          </>
        )}
        {isUserControlledSigningTask && (
          <>
            <EditUserControlledImplementation key={`${bpmnDetails.id}-interfaceImplementation`} />
            <EditCorrespondenceResource key={`${bpmnDetails.id}-correspondenceResource`} />
          </>
        )}
        <div>
          {taskHasConnectedLayoutSet && (
            <StudioDetails>
              <StudioDetails.Summary>
                {t('process_editor.configuration_panel_design_title')}
              </StudioDetails.Summary>
              <StudioDetails.Content className={classes.detailsContent}>
                <EditLayoutSetName existingLayoutSetName={layoutSet.id} />
                <EditDataTypes
                  connectedTaskId={getTaskIdForLayoutSet(layoutSet)}
                  dataModelIds={availableDataModelIds}
                  existingDataTypeForTask={existingDataTypeForTask}
                />
              </StudioDetails.Content>
            </StudioDetails>
          )}
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
