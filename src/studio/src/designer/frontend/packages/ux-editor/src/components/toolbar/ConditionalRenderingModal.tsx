import React from 'react';
import Modal from 'react-modal';
import { Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { ConditionalRenderingComponent } from '../config/ConditionalRenderingComponent';
import RuleButton from './RuleButton';
import {
  addConditionalRenderingConnection,
  deleteConditionalRenderingConnnection,
} from '../../features/serviceConfigurations/serviceConfigurationSlice';
import type { IAppState } from '../../types/global';

export interface IConditionalRenderingModalProps {
  modalOpen: boolean;
  handleClose: () => void;
}

export default function ConditionalRenderingModal(props: IConditionalRenderingModalProps) {
  const dispatch = useDispatch();
  const [selectedConnectionId, setSelectedConnectionId] = React.useState<string>(null);
  const conditionalRendering = useSelector((state: IAppState) => state.serviceConfigurations.conditionalRendering);
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
    dispatch(addConditionalRenderingConnection({ newConnection }));
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function handleDeleteConnection(connectionId: string) {
    dispatch(deleteConditionalRenderingConnnection({ connectionId }));
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function renderConditionRuleConnections(): JSX.Element {
    if (!conditionalRendering || Object.getOwnPropertyNames(conditionalRendering).length === 0) {
      return <Typography variant='caption'>{getLanguageFromKey('right_menu.rules_empty', language)}</Typography>;
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
            deleteConnection={handleDeleteConnection}
          />
        ) : (
          <ConditionalRenderingComponent
            saveEdit={handleSaveChange}
            cancelEdit={handleClose}
            deleteConnection={(connectionId: any) => handleDeleteConnection(connectionId)}
          />
        )}
      </Modal>
      {renderConditionRuleConnections()}
    </>
  );
}
