import React from 'react';
import Modal from 'react-modal';
import { Typography } from '@mui/material';
import { ConditionalRenderingComponent } from '../config/ConditionalRenderingComponent';
import RuleButton from './RuleButton';
import type { IRuleModelFieldElement } from '../../types/global';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFormLayoutsSelector } from '../../hooks/useFormLayoutsSelector';
import {
  allLayoutComponentsSelector,
  allLayoutContainersSelector,
  fullLayoutOrderSelector
} from '../../selectors/formLayoutSelectors';
import { useRuleModelQuery } from '../../hooks/queries/useRuleModelQuery';
import { useRuleConfigQuery } from '../../hooks/queries/useRuleConfigQuery';
import { useRuleConfigMutation } from '../../hooks/mutations/useRuleConfigMutation';
import { ConditionalRenderingConnection } from '../../types/RuleConfig';
import { addConditionalRenderingConnection, deleteConditionalRenderingConnection } from '../../utils/ruleConfigUtils';

export interface IConditionalRenderingModalProps {
  modalOpen: boolean;
  handleClose: () => void;
}

export function ConditionalRenderingModal(props: IConditionalRenderingModalProps) {
  const { org, app } = useParams();
  const [selectedConnectionId, setSelectedConnectionId] = React.useState<string>(null);
  const { data: ruleModel } = useRuleModelQuery(org, app);
  const useRuleConfig = useRuleConfigQuery(org, app);
  const { mutate: saveRuleConfig } = useRuleConfigMutation(org, app);
  const layoutContainers = useFormLayoutsSelector(allLayoutContainersSelector);
  const layoutComponents = useFormLayoutsSelector(allLayoutComponentsSelector);
  const layoutOrder = useFormLayoutsSelector(fullLayoutOrderSelector);
  const { t } = useTranslation();

  const conditionRules = ruleModel?.filter(({ type }: IRuleModelFieldElement) => type === 'condition');
  const ruleConfig = useRuleConfig.data;

  function selectConnection(newSelectedConnectionId: string) {
    setSelectedConnectionId(newSelectedConnectionId);
    props.handleClose();
  }

  function handleClose() {
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function handleSaveChange(id: string, connection: ConditionalRenderingConnection) {
    saveRuleConfig(addConditionalRenderingConnection(ruleConfig, id, connection));
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function handleDeleteConnection(connectionId: string) {
    saveRuleConfig(deleteConditionalRenderingConnection(ruleConfig, connectionId));
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function renderConditionRuleConnections(): JSX.Element {
    if (!{ ruleConfig } || Object.getOwnPropertyNames({ ruleConfig }).length === 0) {
      return (
        <Typography variant='caption'>
          {t('right_menu.rules_empty')}
        </Typography>
      );
    }
    return (ruleConfig &&
      <>
        {Object.keys({ ruleConfig } || {}).map((key: string) => (
          <RuleButton
            key={key}
            text={ruleConfig.conditionalRendering[key]?.selectedFunction}
            onClick={() => selectConnection(key)}
          />
        ))}
      </>
    );
  }
  return (ruleConfig && (
    <>
      <Modal
        isOpen={props.modalOpen}
        onRequestClose={handleClose}
        className='react-modal a-modal-content-target a-page a-current-page modalPage'
        ariaHideApp={false}
        overlayClassName='react-modal-overlay '
      >
        {selectedConnectionId ? (
          <ConditionalRenderingComponent
            connectionId={selectedConnectionId}
            saveEdit={handleSaveChange}
            cancelEdit={handleClose}
            conditionalRendering={ruleConfig.conditionalRendering}
            deleteConnection={handleDeleteConnection}
            formLayoutContainers={layoutContainers}
            formLayoutComponents={layoutComponents}
            order={layoutOrder}
            ruleModelElements={conditionRules}
          />
        ) : (
          <ConditionalRenderingComponent
            saveEdit={handleSaveChange}
            cancelEdit={handleClose}
            conditionalRendering={ruleConfig.conditionalRendering}
            deleteConnection={handleDeleteConnection}
            formLayoutContainers={layoutContainers}
            formLayoutComponents={layoutComponents}
            order={layoutOrder}
            ruleModelElements={conditionRules}
          />
        )}
      </Modal>
      {renderConditionRuleConnections()}
    </>
  )
  );
}
