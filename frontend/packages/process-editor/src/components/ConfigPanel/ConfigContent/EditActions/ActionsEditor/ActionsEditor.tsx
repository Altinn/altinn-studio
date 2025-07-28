import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioCard,
  StudioTabs,
  StudioDivider,
  StudioButton,
  StudioDeleteButton,
  StudioProperty,
} from '@studio/components-legacy';
import { StudioParagraph } from '@studio/components';
import { XMarkIcon } from '@studio/icons';
import { CustomActions } from './CustomActions';
import { PredefinedActions } from './PredefinedActions';
import { useBpmnContext } from '../../../../../contexts/BpmnContext';
import { type Action, BpmnActionModeler } from '../../../../../utils/bpmnModeler/BpmnActionModeler';
import { getPredefinedActions, isActionRequiredForTask } from '../../../../../utils/processActions';
import classes from './ActionsEditor.module.css';

enum TabIds {
  Predefined = 'predefined',
  Custom = 'custom',
}

type ComponentMode = 'edit' | 'view';

export type ActionsEditorProps = {
  actionElement: Action;
  actionIndex: number;
  mode?: ComponentMode;
  onDeleteClick?: () => void;
};
export const ActionsEditor = ({
  actionElement,
  actionIndex,
  mode,
  onDeleteClick,
}: ActionsEditorProps): React.ReactElement => {
  const [componentMode, setComponentMode] = React.useState<ComponentMode>(mode || 'view');
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const bpmnActionModeler = new BpmnActionModeler(bpmnDetails.element);

  const actionLabel = t('process_editor.configuration_panel_actions_action_label', {
    actionIndex: actionIndex + 1,
  });

  const handleOnClose = (): void => {
    setComponentMode('view');
    if (!actionElement.action) handleOnDelete();
  };

  const handleOnDelete = (): void => {
    bpmnActionModeler.deleteActionFromTask(actionElement);
    onDeleteClick();
  };

  if (componentMode === 'edit') {
    return (
      <ActionEditable
        actionElement={actionElement}
        actionIndex={actionIndex}
        onClose={handleOnClose}
        onDelete={handleOnDelete}
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
    <StudioCard className={classes.container}>
      <StudioCard.Header className={classes.cardHeader}>
        <StudioParagraph data-size='sm'>
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
          aria-label={t('general.close_item', {
            item: actionElement.action,
          })}
          variant='secondary'
          icon={<XMarkIcon />}
          onClick={onClose}
        />
        <StudioDeleteButton
          size='small'
          onDelete={onDelete}
          aria-label={t('general.delete_item', {
            item: actionElement.action,
          })}
        />
      </StudioCard.Footer>
    </StudioCard>
  );
};
