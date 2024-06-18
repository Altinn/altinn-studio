import React from 'react';
import {
  StudioCard,
  StudioTabs,
  StudioHeading,
  StudioDivider,
  StudioButton,
  StudioDeleteButton,
  StudioProperty,
} from '@studio/components';
import { CheckmarkIcon } from '@studio/icons';
import { PredefinedActions } from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsEditor/PredefinedActions/PredefinedActions';
import { CustomActions } from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsEditor/CustomActions';

import classes from './ActionsEditor.module.css';
import { Action, BpmnActionModeler } from '@altinn/process-editor/utils/bpmn/BpmnActionModeler';
import { useBpmnContext } from '@altinn/process-editor/contexts/BpmnContext';
import { isActionRequiredForTask } from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsUtils';
import { useTranslation } from 'react-i18next';

enum TabIds {
  Predefined = 'predefined',
  Custom = 'custom',
}

type ComponentMode = 'edit' | 'view';

type ActionsEditorProps = {
  actionElement: Action;
  actionIndex: number;
  mode?: ComponentMode;
};
export const ActionsEditor = ({
  actionElement,
  actionIndex,
  mode,
}: ActionsEditorProps): React.ReactElement => {
  const [componentMode, setComponentMode] = React.useState<ComponentMode>(mode || 'view');
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const bpmnActionModeler = new BpmnActionModeler(bpmnDetails.element);

  const actionLabel = t('process_editor.configuration_panel_actions_action_label', {
    actionIndex: actionIndex + 1,
    actionName: actionElement.action,
  });

  if (componentMode === 'edit') {
    return (
      <ActionEditable
        actionElement={actionElement}
        actionIndex={actionIndex}
        onClose={() => setComponentMode('view')}
        onDelete={() => bpmnActionModeler.deleteActionFromTask(actionElement)}
      />
    );
  }

  return (
    <StudioProperty.Button
      aria-label={actionLabel}
      readOnly={isActionRequiredForTask(actionElement.action, bpmnDetails.taskType)}
      onClick={() => setComponentMode('edit')}
      property={actionLabel}
      value={actionElement.action}
      className={classes.actionView}
    />
  );
};

type ActionEditableProps = {
  actionElement: Action;
  actionIndex: number;
  onClose: () => void;
  onDelete: () => void;
};
const ActionEditable = ({ actionElement, actionIndex, onClose, onDelete }: ActionEditableProps) => {
  const { t } = useTranslation();

  return (
    <StudioCard style={{ margin: '8px' }}>
      <StudioCard.Header>
        <StudioHeading level={3} size='xxsmall'>
          {t('process_editor.configuration_panel_actions_action_card_title', {
            actionIndex: actionIndex + 1,
          })}
        </StudioHeading>
      </StudioCard.Header>
      <StudioDivider color='subtle' />
      <StudioCard.Content>
        <StudioTabs defaultValue={TabIds.Predefined} size='small' className={classes.tabsContainer}>
          <StudioTabs.List>
            <StudioTabs.Tab value={TabIds.Predefined}>
              {t('process_editor.configuration_panel_actions_action_tab_predefined')}
            </StudioTabs.Tab>
            <StudioTabs.Tab value={TabIds.Custom}>
              {t('process_editor.configuration_panel_actions_action_card_custom')}
            </StudioTabs.Tab>
          </StudioTabs.List>
          <StudioTabs.Content value={TabIds.Predefined} className={classes.tabsContent}>
            <PredefinedActions actionElement={actionElement} />
          </StudioTabs.Content>
          <StudioTabs.Content value={TabIds.Custom}>
            <CustomActions />
          </StudioTabs.Content>
        </StudioTabs>
      </StudioCard.Content>
      <StudioCard.Footer>
        <StudioButton
          size='small'
          variant='secondary'
          color='success'
          icon={<CheckmarkIcon />}
          onClick={onClose}
        />
        <StudioDeleteButton size='small' onDelete={onDelete} />
      </StudioCard.Footer>
    </StudioCard>
  );
};
