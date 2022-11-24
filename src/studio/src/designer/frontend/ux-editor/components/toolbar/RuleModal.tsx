import React from 'react';
import Modal from 'react-modal';
import { Typography } from '@mui/material';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useDispatch, useSelector } from 'react-redux';
import { RuleComponent } from '../config/RuleComponent';
import RuleButton from './RuleButton';
import {
  addRuleConnection,
  deleteRuleConnnection,
} from '../../features/serviceConfigurations/serviceConfigurationSlice';
import type { IAppState } from '../../types/global';

export interface IRuleModalProps {
  modalOpen: boolean;
  handleClose: () => void;
}

export default function RuleModal(props: IRuleModalProps) {
  const dispatch = useDispatch();
  const [selectedConnectionId, setSelectedConnectionId] = React.useState<string>(null);
  const ruleConnection = useSelector(
    (state: IAppState) => state.serviceConfigurations.ruleConnection
  );
  const language = useSelector((state: IAppState) => state.appData.languageState.language);

  function selectConnection(newSelectedConnectionId: string) {
    setSelectedConnectionId(newSelectedConnectionId);
    props.handleClose();
  }

  function handleClose() {
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function handleSaveChange(newConnection: string) {
    dispatch(addRuleConnection({ newConnection }));
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function handleDeleteConnection(connectionId: string) {
    dispatch(deleteRuleConnnection({ connectionId }));
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function renderRuleConnections(): JSX.Element {
    if (!ruleConnection || Object.getOwnPropertyNames(ruleConnection).length === 0) {
      return (
        <Typography variant='caption'>
          {getLanguageFromKey('right_menu.rules_empty', language)}
        </Typography>
      );
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
            deleteConnection={handleDeleteConnection}
          />
        ) : (
          <RuleComponent
            saveEdit={handleSaveChange}
            cancelEdit={handleClose}
            deleteConnection={(connectionId: any) => handleDeleteConnection(connectionId)}
          />
        )}
      </Modal>
      {renderRuleConnections()}
    </>
  );
}
