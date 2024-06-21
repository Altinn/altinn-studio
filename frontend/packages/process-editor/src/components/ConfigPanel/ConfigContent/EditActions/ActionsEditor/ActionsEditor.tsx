import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioCard,
  StudioTabs,
  StudioDivider,
  StudioButton,
  StudioDeleteButton,
  StudioProperty,
  StudioParagraph,
} from '@studio/components';
import { CheckmarkIcon } from '@studio/icons';
import { PredefinedActions } from './PredefinedActions';
import { CustomActions } from './CustomActions';
import { type Action, BpmnActionModeler } from '../../../../../utils/bpmn/BpmnActionModeler';
import { useBpmnContext } from '../../../../../contexts/BpmnContext';
import { getPredefinedActions, isActionRequiredForTask } from '../ActionsUtils';

import classes from './ActionsEditor.module.css';

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
const ActionEditable = ({
  actionElement,
  actionIndex,
  onClose,
  onDelete,
}: ActionEditableProps): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();

  const isCustomAction =
    actionElement.action !== undefined &&
    !getPredefinedActions(bpmnDetails.taskType).includes(actionElement.action);

  return (
    <StudioCard>
      <StudioCard.Header className={classes.cardHeader}>
        <StudioParagraph size='small'>
          {t('process_editor.configuration_panel_actions_action_card_title', {
            actionIndex: actionIndex + 1,
          })}
        </StudioParagraph>
      </StudioCard.Header>
      <StudioDivider color='subtle' className={classes.cardDivider} />
      <StudioCard.Content className={classes.cardContent}>
        <StudioTabs
          defaultValue={isCustomAction ? TabIds.Custom : TabIds.Predefined}
          size='small'
          className={classes.tabsContainer}
        >
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
          <StudioTabs.Content value={TabIds.Custom} className={classes.tabsContent}>
            <CustomActions actionElement={actionElement} />
          </StudioTabs.Content>
        </StudioTabs>
      </StudioCard.Content>
      <StudioCard.Footer className={classes.cardFooter}>
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
