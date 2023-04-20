import React from 'react';
import Modal from 'react-modal';
import { Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { ConditionalRenderingComponent } from '../config/ConditionalRenderingComponent';
import RuleButton from './RuleButton';
import {
  addConditionalRenderingConnection,
  deleteConditionalRenderingConnnection,
} from '../../features/serviceConfigurations/serviceConfigurationSlice';
import type { IAppState } from '../../types/global';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFormLayoutsSelector } from '../../hooks/useFormLayoutsSelector';
import {
  allLayoutComponentsSelector,
  allLayoutContainersSelector,
  fullLayoutOrderSelector
} from '../../selectors/formLayoutSelectors';

export interface IConditionalRenderingModalProps {
  modalOpen: boolean;
  handleClose: () => void;
}

export function ConditionalRenderingModal(props: IConditionalRenderingModalProps) {
  const { org, app } = useParams();
  const dispatch = useDispatch();
  const [selectedConnectionId, setSelectedConnectionId] = React.useState<string>(null);
  const conditionalRendering = useSelector(
    (state: IAppState) => state.serviceConfigurations.conditionalRendering
  );
  const layoutContainers = useFormLayoutsSelector(allLayoutContainersSelector);
  const layoutComponents = useFormLayoutsSelector(allLayoutComponentsSelector);
  const layoutOrder = useFormLayoutsSelector(fullLayoutOrderSelector);
  const { t } = useTranslation();

  function selectConnection(newSelectedConnectionId: string) {
    setSelectedConnectionId(newSelectedConnectionId);
    props.handleClose();
  }

  function handleClose() {
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function handleSaveChange(newConnection: string) {
    dispatch(addConditionalRenderingConnection({ newConnection, org, app }));
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function handleDeleteConnection(connectionId: string) {
    dispatch(deleteConditionalRenderingConnnection({ connectionId, org, app }));
    setSelectedConnectionId(null);
    props.handleClose();
  }

  function renderConditionRuleConnections(): JSX.Element {
    if (!conditionalRendering || Object.getOwnPropertyNames(conditionalRendering).length === 0) {
      return (
        <Typography variant='caption'>
          {t('right_menu.rules_empty')}
        </Typography>
      );
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
            formLayoutContainers={layoutContainers}
            formLayoutComponents={layoutComponents}
            order={layoutOrder}
          />
        ) : (
          <ConditionalRenderingComponent
            saveEdit={handleSaveChange}
            cancelEdit={handleClose}
            deleteConnection={(connectionId: any) => handleDeleteConnection(connectionId)}
            formLayoutContainers={layoutContainers}
            formLayoutComponents={layoutComponents}
            order={layoutOrder}
          />
        )}
      </Modal>
      {renderConditionRuleConnections()}
    </>
  );
}
