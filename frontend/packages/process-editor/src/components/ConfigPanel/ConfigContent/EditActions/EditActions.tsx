import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioProperty } from '@studio/components';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { useChecksum } from './useChecksum';
import { ActionsEditor } from './ActionsEditor';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { type Action, BpmnActionModeler } from '../../../../utils/bpmnModeler/BpmnActionModeler';
import { useUniqueKey } from 'app-shared/hooks/useUniqueKey';
import classes from './EditActions.module.css';

export const EditActions = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const bpmnActionModeler = new BpmnActionModeler(bpmnDetails.element);
  // This is a custom hook that is used to force re-render the component, since the actions from bpmnjs are not reactive
  const { updateChecksum: forceReRenderComponent } = useChecksum();
  const actions: Action[] = bpmnActionModeler.actionElements?.action || [];
  const { getUniqueKey, removeKey } = useUniqueKey({ maxNumberOfItems: actions.length });

  const handleDeleteActionItem = (index: number): void => {
    removeKey(index);
  };

  const onNewActionAddClicked = (): void => {
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
    <>
      {actions.map((actionElement: ModdleElement, index: number) => (
        <div key={getUniqueKey(index)} className={classes.container}>
          <ActionsEditor
            actionElement={actionElement}
            actionIndex={index}
            mode={!actionElement.action ? 'edit' : 'view'}
            onDeleteClick={() => handleDeleteActionItem(index)}
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
