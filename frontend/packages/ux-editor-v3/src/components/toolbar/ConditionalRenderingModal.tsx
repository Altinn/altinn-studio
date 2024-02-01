import React from 'react';
import Modal from 'react-modal';
import { Typography } from '@mui/material';
import { ConditionalRenderingComponent } from '../config/ConditionalRenderingComponent';
import RuleButton from './RuleButton';
import type { IRuleModelFieldElement } from '../../types/global';
import { useTranslation } from 'react-i18next';
import {
  getAllLayoutContainers,
  getAllLayoutComponents,
  getFullLayoutOrder,
} from '../../selectors/formLayoutSelectors';
import { useRuleModelQuery } from '../../hooks/queries/useRuleModelQuery';
import { useRuleConfigQuery } from '../../hooks/queries/useRuleConfigQuery';
import { useRuleConfigMutation } from '../../hooks/mutations/useRuleConfigMutation';
import type { ConditionalRenderingConnection } from 'app-shared/types/RuleConfig';
import {
  addConditionalRenderingConnection,
  deleteConditionalRenderingConnection,
} from '../../utils/ruleConfigUtils';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import { useAppContext } from '../../hooks/useAppContext';

export interface IConditionalRenderingModalProps {
  modalOpen: boolean;
  handleClose: () => void;
  handleOpen: () => void;
}

export function ConditionalRenderingModal(props: IConditionalRenderingModalProps) {
  const { org, app } = useStudioUrlParams();
  const [selectedConnectionId, setSelectedConnectionId] = React.useState<string>(null);
  const { selectedLayoutSet } = useAppContext();
  const { data: ruleModel } = useRuleModelQuery(org, app, selectedLayoutSet);
  const { data: ruleConfig } = useRuleConfigQuery(org, app, selectedLayoutSet);
  const { mutate: saveRuleConfig } = useRuleConfigMutation(org, app, selectedLayoutSet);
  const { data: formLayouts } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const layoutContainers = getAllLayoutContainers(formLayouts);
  const layoutComponents = getAllLayoutComponents(formLayouts);
  const layoutOrder = getFullLayoutOrder(formLayouts);
  const { t } = useTranslation();

  const conditionRules = ruleModel?.filter(
    ({ type }: IRuleModelFieldElement) => type === 'condition',
  );
  const { conditionalRendering } = ruleConfig?.data ?? {};

  function selectConnection(newSelectedConnectionId: string) {
    setSelectedConnectionId(newSelectedConnectionId);
    props.handleOpen();
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
    if (!conditionalRendering || Object.getOwnPropertyNames(conditionalRendering).length === 0) {
      return <Typography variant='caption'>{t('right_menu.rules_empty')}</Typography>;
    }
    return (
      <>
        {Object.keys(conditionalRendering || {}).map((key: string) => (
          <RuleButton
            key={key}
            text={conditionalRendering[key]?.selectedFunction}
            onClick={() => selectConnection(key)}
          />
        ))}
      </>
    );
  }
  return (
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
            conditionalRendering={conditionalRendering}
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
            conditionalRendering={conditionalRendering}
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
  );
}
