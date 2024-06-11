import React from 'react';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useTranslation } from 'react-i18next';
import { StudioProperty } from '@studio/components';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { getAvailablePredefinedActions } from './ActionsUtils';
import { EditAction } from './EditAction';
import { BpmnActionModeler } from '@altinn/process-editor/utils/bpmn/BpmnActionModeler';

export const EditActions = () => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const bpmnActionModeler = new BpmnActionModeler(bpmnDetails.element);

  // TODO write the code better to handle undefined instead
  const actions = bpmnActionModeler.actionElements.action || [];

  const availablePredefinedActions = getAvailablePredefinedActions(bpmnDetails.taskType, actions);

  const handleOnSaveActions = (): void => {
    const shouldUpdateExistingActions = bpmnActionModeler.hasActionsAlready;
    if (shouldUpdateExistingActions) {
      // TODO should have an actionElement here?
      bpmnActionModeler.updateActionNameOnActionElement('', undefined);
      return;
    }

    bpmnActionModeler.addNewActionToTask(undefined);
    // addNewActionToTask(bpmnFactory, modeling, undefined, bpmnDetails);
  };

  return (
    <>
      {actions.map((actionElement: ModdleElement, index: number) => (
        <EditAction
          key={actionElement.action}
          actionElementToEdit={actionElement}
          availablePredefinedActions={availablePredefinedActions}
          bpmnDetails={bpmnDetails}
          index={index}
          // TODO: This modeling do not need to be passed down to the EditAction component after refactoring
          modeling={bpmnActionModeler.modeling}
        />
      ))}
      <StudioProperty.Button
        onClick={handleOnSaveActions}
        property={t('process_editor.configuration_panel_actions_add_new')}
        size='small'
      />
    </>
  );
};
