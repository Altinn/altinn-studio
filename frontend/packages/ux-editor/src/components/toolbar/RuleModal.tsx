import React from 'react';
import Modal from 'react-modal';
import { Typography } from '@mui/material';
import { RuleComponent } from '../config/RuleComponent';
import RuleButton from './RuleButton';
import { useTranslation } from 'react-i18next';
import { useRuleModelQuery } from '../../hooks/queries/useRuleModelQuery';
import type { RuleConnection } from 'app-shared/types/RuleConfig';
import { useRuleConfigQuery } from '../../hooks/queries/useRuleConfigQuery';
import { useRuleConfigMutation } from '../../hooks/mutations/useRuleConfigMutation';
import { addRuleConnection, deleteRuleConnection } from '../../utils/ruleConfigUtils';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../hooks/useAppContext';

export interface IRuleModalProps {
  modalOpen: boolean;
  handleClose: () => void;
  handleOpen: () => void;
}

export function RuleModal(props: IRuleModalProps) {
  const { org, app } = useStudioUrlParams();
  const [selectedConnectionId, setSelectedConnectionId] = React.useState<string>(null);
  const { selectedLayoutSet } = useAppContext();
  const { data: ruleConfig } = useRuleConfigQuery(org, app, selectedLayoutSet);
  const { data: ruleModelElements } = useRuleModelQuery(org, app, selectedLayoutSet);
  const { mutate: saveRuleConfig } = useRuleConfigMutation(org, app, selectedLayoutSet);
  const { t } = useTranslation();

  const { ruleConnection } = ruleConfig?.data ?? {};

  function selectConnection(newSelectedConnectionId: string) {
    setSelectedConnectionId(newSelectedConnectionId);
    props.handleOpen();
  }

  function handleClose() {
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function handleSaveChange(id: string, connection: RuleConnection) {
    saveRuleConfig(addRuleConnection(ruleConfig, id, connection));
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function handleDeleteConnection(connectionId: string) {
    saveRuleConfig(deleteRuleConnection(ruleConfig, connectionId));
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function renderRuleConnections(): JSX.Element {
    if (!ruleConnection || Object.getOwnPropertyNames(ruleConnection).length === 0) {
      return <Typography variant='caption'>{t('right_menu.rules_empty')}</Typography>;
    }
    return (
      <>
        {Object.keys(ruleConnection || {}).map((key: string) => (
          <RuleButton
            key={key}
            text={ruleConnection[key]?.selectedFunction}
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
        overlayClassName='react-modal-overlay'
      >
        {selectedConnectionId ? (
          <RuleComponent
            connectionId={selectedConnectionId}
            saveEdit={handleSaveChange}
            cancelEdit={handleClose}
            deleteConnection={(connectionId: any) => handleDeleteConnection(connectionId)}
            ruleConnection={ruleConnection}
            ruleModelElements={ruleModelElements}
          />
        ) : (
          <RuleComponent
            saveEdit={handleSaveChange}
            cancelEdit={handleClose}
            deleteConnection={(connectionId: any) => handleDeleteConnection(connectionId)}
            ruleConnection={ruleConnection}
            ruleModelElements={ruleModelElements}
          />
        )}
      </Modal>
      {renderRuleConnections()}
    </>
  );
}
