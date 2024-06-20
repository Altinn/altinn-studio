import React from 'react';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useTranslation } from 'react-i18next';
import { StudioProperty } from '@studio/components';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { Action, BpmnActionModeler } from '@altinn/process-editor/utils/bpmn/BpmnActionModeler';
import { ActionsEditor } from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsEditor/ActionsEditor';
import { useChecksum } from './useChecksum';

export const EditActions = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const bpmnActionModeler = new BpmnActionModeler(bpmnDetails.element);
  const { updateChecksum } = useChecksum();
  const actions: Action[] = bpmnActionModeler.actionElements?.action || [];

  const onNewActionAddClicked = (): void => {
    // TODO: find a better way to handle re-rendering of the component
    // Need to update checksum to trigger re-render of the component, because React does not re-render when actions changes
    updateChecksum();

    const shouldUpdateExistingActions = bpmnActionModeler.hasActionsAlready;
    if (shouldUpdateExistingActions) {
      const existingActionElement = bpmnActionModeler.actionElements;

      const newActionElement = bpmnActionModeler.createActionElement(undefined);
      existingActionElement?.action.push(newActionElement);

      bpmnActionModeler.updateActionNameOnActionElement(
        bpmnActionModeler.getExtensionElements(),
        undefined,
      );

      return;
    }

    bpmnActionModeler.addNewActionToTask(undefined);
  };

  return (
    <>
      {actions.map((actionElement: ModdleElement, index: number) => (
        // TODO: improve the key, but we cannot use the actionElement.action as key
        <div key={index}>
          <ActionsEditor
            actionElement={actionElement}
            actionIndex={index}
            mode={!actionElement.action ? 'edit' : 'view'}
          />
        </div>
      ))}
      <StudioProperty.Button
        onClick={onNewActionAddClicked}
        property={t('process_editor.configuration_panel_actions_add_new')}
        size='small'
      />
    </>
  );
};
