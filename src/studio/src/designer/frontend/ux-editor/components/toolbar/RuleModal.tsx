import * as React from 'react';
import * as Modal from 'react-modal';
import { Typography } from '@material-ui/core';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useSelector } from 'react-redux';
import RuleConnectionActionDispatchers from '../../actions/ruleConnectionActions/ruleConnectionActionDispatcher';
import { RuleComponent } from '../config/RuleComponent';
import RuleButton from './RuleButton';

export interface IRuleModalProps {
  modalOpen: boolean;
  handleClose: () => void;
}

export default function RuleModal(props: IRuleModalProps) {
  const [selectedConnectionId, setSelectedConnectionId] = React.useState<string>(null);
  const ruleConnection = useSelector((state: IAppState) => state.serviceConfigurations.ruleConnection);
  const language = useSelector((state: IAppState) => state.appData.language.language);

  function selectConnection(newSelectedConnectionId: string) {
    setSelectedConnectionId(newSelectedConnectionId);
    props.handleClose();
  }

  function handleClose() {
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function handleSaveChange(newConnection: string) {
    RuleConnectionActionDispatchers.addRuleConnection(newConnection);
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function handleDeleteConnection(connectionId: string) {
    RuleConnectionActionDispatchers.delRuleConnection(connectionId);
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
            text={ruleConnection[key].selectedFunction}
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
        {selectedConnectionId ?
          <RuleComponent
            connectionId={selectedConnectionId}
            saveEdit={handleSaveChange}
            cancelEdit={handleClose}
            deleteConnection={handleDeleteConnection}
          />
          :
          <RuleComponent
            saveEdit={handleSaveChange}
            cancelEdit={handleClose}
            deleteConnection={(connectionId: any) => handleDeleteConnection(connectionId)}
          />
        }
      </Modal>
      {renderRuleConnections()}
    </>
  );
}
