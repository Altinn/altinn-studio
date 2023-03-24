import React from 'react';
import Modal from 'react-modal';
import { Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RuleComponent } from '../config/RuleComponent';
import RuleButton from './RuleButton';
import {
  addRuleConnection,
  deleteRuleConnnection,
} from '../../features/serviceConfigurations/serviceConfigurationSlice';
import type { IAppState } from '../../types/global';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDatamodelQuery } from '../../hooks/queries';

export interface IRuleModalProps {
  modalOpen: boolean;
  handleClose: () => void;
}

export function RuleModal(props: IRuleModalProps) {
  const { org, app } = useParams();
  const dispatch = useDispatch();
  const [selectedConnectionId, setSelectedConnectionId] = React.useState<string>(null);
  const ruleConnection = useSelector(
    (state: IAppState) => state.serviceConfigurations.ruleConnection
  );
  const { t } = useTranslation();
  const datamodelQuery = useDatamodelQuery(org, app);

  function selectConnection(newSelectedConnectionId: string) {
    setSelectedConnectionId(newSelectedConnectionId);
    props.handleClose();
  }

  function handleClose() {
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function handleSaveChange(newConnection: string) {
    dispatch(addRuleConnection({ newConnection, org, app }));
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function handleDeleteConnection(connectionId: string) {
    dispatch(deleteRuleConnnection({ connectionId, org, app }));
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function renderRuleConnections(): JSX.Element {
    if (!ruleConnection || Object.getOwnPropertyNames(ruleConnection).length === 0) {
      return (
        <Typography variant='caption'>
          {t('right_menu.rules_empty')}
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

  const datamodelElements = datamodelQuery?.data ?? [];
  const ruleModelElements = datamodelElements.filter((key: any) => key.type === 'rule');

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
            datamodelElements={datamodelElements}
            ruleModelElements={ruleModelElements}
          />
        ) : (
          <RuleComponent
            saveEdit={handleSaveChange}
            cancelEdit={handleClose}
            deleteConnection={(connectionId: any) => handleDeleteConnection(connectionId)}
            datamodelElements={datamodelElements}
            ruleModelElements={ruleModelElements}
          />
        )}
      </Modal>
      {renderRuleConnections()}
    </>
  );
}
