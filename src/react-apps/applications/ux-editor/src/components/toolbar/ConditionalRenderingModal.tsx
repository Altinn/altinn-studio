import * as React from 'react';
import * as Modal from 'react-modal';
import { connect } from 'react-redux';
import ConditionalRenderingActionDispatchers from '../../actions/conditionalRenderingActions/conditionalRenderingActionDispatcher';
import { ConditionalRenderingComponent } from '../config/ConditionalRenderingComponent';

export interface IConditionalRenderingModalProps {
  conditionalRendering: any;
  language: any;
}

export interface IConditionalRenderingModalState {
  modalOpen: boolean;
  selectedConnectionId: string;
}

class ConditionalRenderingModal extends React.Component<IConditionalRenderingModalProps,
  IConditionalRenderingModalState> {
  public state = {
    modalOpen: false,
    selectedConnectionId: null as any,
  };

  /**
   * Method for adding a new conneciton and opening the modal
   */
  public createNewConnection = () => {
    this.setState({ modalOpen: !this.state.modalOpen });
  }

  /**
   * Method for selecting an existing connection
   */
  public selectConnection = (selectedConnectionId: any) => {
    this.setState({
      modalOpen: !this.state.modalOpen,
      selectedConnectionId,
    });
  }

  /**
   * Method for closing the modal
   */
  public handleCloseModal = () => {
    this.setState({
      modalOpen: !this.state.modalOpen,
      selectedConnectionId: null,
    });
  }

  /**
   * Method for handling saving changes made to a connection
   */
  public handleSaveChange = (newConnection: any): void => {
    ConditionalRenderingActionDispatchers.addConditionalRendering(newConnection);
    this.handleCloseModal();
  }

  /**
   * Method for deleting an existing connection
   */
  public handleDeleteConnection = (connectionId: any): void => {
    ConditionalRenderingActionDispatchers.delConditionalRendering(connectionId);
    this.handleCloseModal();
  }

  /**
   * Method for rendering all the exsisting conditional rendering rule connections
   */
  public renderConditionRuleConnections = (): JSX.Element => {
    if (!this.props.conditionalRendering || Object.getOwnPropertyNames(this.props.conditionalRendering).length === 0) {
      return null;
    }
    return (
      <>
        {Object.keys(this.props.conditionalRendering).map((key: any, index: number) => (
          <div className='a-topTasks' key={index}>
            <button
              type='button'
              className='a-btn a-btn-icon a-btn-transparentWhite'
              onClick={this.selectConnection.bind(this, key)}
            >
              <i className='fa fa-settings a-btn-icon-symbol' />
              <span className='a-btn-icon-text'>
                {this.props.conditionalRendering[key].selectedFunction}
              </span>
            </button>
          </div>
        ))}
      </>
    );
  }

  /**
   * Method for rendering existing connections and button for creating new once
   */
  public render(): JSX.Element {
    return (
      <>
        <p className='a-fontSizeS mt-2 mb-1'>
          {this.props.language.ux_editor.conditional_rendering_connection_header}
        </p>
        <button
          type='button'
          className='a-btn a-btn-action a-fullWidthBtn a-btnBigger'
          onClick={this.createNewConnection}
        >
          <i className='fa fa-plus a-blue' onClick={this.createNewConnection} />
          <span className='a-fontSizeXS'>
            {this.props.language.general.add_connection}
          </span>
        </button>
        <Modal
          isOpen={this.state.modalOpen}
          onRequestClose={this.handleCloseModal}
          className='react-modal a-modal-content-target a-page a-current-page modalPage'
          ariaHideApp={false}
          overlayClassName='react-modal-overlay '
        >
          {this.state.selectedConnectionId ?
            <ConditionalRenderingComponent
              connectionId={this.state.selectedConnectionId}
              saveEdit={this.handleSaveChange}
              cancelEdit={this.handleCloseModal}
              deleteConnection={this.handleDeleteConnection}
            />
            :
            <ConditionalRenderingComponent
              saveEdit={this.handleSaveChange}
              cancelEdit={this.handleCloseModal}
              deleteConnection={(connectionId: any) => this.handleDeleteConnection(connectionId)}
            />
          }
        </Modal>
        {this.renderConditionRuleConnections()}
      </>
    );
  }
}

const mapStateToProps: (state: IAppState) => IConditionalRenderingModalProps = (state: IAppState) => ({
  conditionalRendering: state.serviceConfigurations.conditionalRendering,
  language: state.appData.language.language,
});

export const ConditionalRenderingModalComponent = connect(mapStateToProps)(ConditionalRenderingModal);
