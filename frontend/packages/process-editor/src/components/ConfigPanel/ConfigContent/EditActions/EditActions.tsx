import React from 'react';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useTranslation } from 'react-i18next';
import { StudioProperty } from '@studio/components';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import { addNewActionToTask, getAvailablePredefinedActions } from './ActionsUtils';
import { EditAction } from './EditAction';

export const EditActions = () => {
  const { t } = useTranslation();
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const actionElements: ModdleElement[] =
    bpmnDetails?.element?.businessObject?.extensionElements?.values[0]?.actions?.action ?? [];
  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  const bpmnFactory: BpmnFactory = modelerInstance.get('bpmnFactory');

  const availablePredefinedActions = getAvailablePredefinedActions(
    bpmnDetails.taskType,
    actionElements,
  );

  const handleAddNewAction = () => {
    addNewActionToTask(bpmnFactory, modeling, undefined, bpmnDetails);
  };

  return (
    <>
      {actionElements.map((actionElement: ModdleElement, index: number) => (
        <EditAction
          key={actionElement.action}
          actionElementToEdit={actionElement}
          availablePredefinedActions={availablePredefinedActions}
          bpmnDetails={bpmnDetails}
          index={index}
          modeling={modeling}
        />
      ))}
      <StudioProperty.Button
        onClick={handleAddNewAction}
        property={t('process_editor.configuration_panel_actions_add_new')}
        size='small'
      />
    </>
  );
};
