import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioProperty } from 'libs/studio-components/src';
import { useUniqueKeys } from 'libs/studio-hooks/src';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { useChecksum } from './useChecksum';
import { ActionsEditor } from './ActionsEditor';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { type Action, BpmnActionModeler } from '../../../../utils/bpmnModeler/BpmnActionModeler';

export const EditActions = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const bpmnActionModeler = new BpmnActionModeler(bpmnDetails.element);
  // This is a custom hook that is used to force re-render the component, since the actions from bpmnjs are not reactive
  const { updateChecksum: forceReRenderComponent } = useChecksum();
  const actions: Action[] = bpmnActionModeler.actionElements?.action || [];
  const { getUniqueKey, addUniqueKey, removeUniqueKey } = useUniqueKeys({
    numberOfKeys: actions.length,
  });

  const onDeleteActionItemSideEffect = (index: number): void => {
    // Removes the item at the specified index to ensure new unique IDs are generated for the action list.
    // This approach is necessary because the list may contain non-unique data or IDs.
    removeUniqueKey(index);
  };

  const onNewActionAddClicked = (): void => {
    addUniqueKey();
    const shouldUpdateExistingActions = bpmnActionModeler.hasActionsAlready;
    if (shouldUpdateExistingActions) {
      const existingActionElement = bpmnActionModeler.actionElements;

      const newActionElement = bpmnActionModeler.createActionElement(undefined);
      existingActionElement?.action.push(newActionElement);

      bpmnActionModeler.updateActionNameOnActionElement(
        bpmnActionModeler.getExtensionElements(),
        undefined,
      );
      forceReRenderComponent();
      return;
    }
    bpmnActionModeler.addNewActionToTask(undefined);
    forceReRenderComponent();
  };

  return (
    <StudioProperty.Group>
      {actions.map((actionElement: ModdleElement, index: number) => (
        <ActionsEditor
          key={getUniqueKey(index)}
          actionElement={actionElement}
          actionIndex={index}
          mode={!actionElement.action ? 'edit' : 'view'}
          onDeleteClick={() => onDeleteActionItemSideEffect(index)}
        />
      ))}
      <StudioProperty.Button
        onClick={onNewActionAddClicked}
        property={t('process_editor.configuration_panel_actions_add_new')}
      />
    </StudioProperty.Group>
  );
};
