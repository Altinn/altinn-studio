import * as React from 'react';
import * as Modal from 'react-modal';
import { connect } from 'react-redux';
import ApiActionDispatchers from '../../actions/apiActions/apiActionDispatcher';
import { ApiConfigurationComponent } from '../config/ApiConfigurationComponent';

export interface IExternalApiModalProps {
  connections: any;
  externalApisById: any;
  language: any;
}

export interface IExternalApiModalState {
  modalOpen: boolean;
  selectedConnectionId: string;
}

class ExternalApiModal extends React.Component<IExternalApiModalProps, IExternalApiModalState> {
  public state = {
    modalOpen: false,
    selectedConnectionId: null as any,
  };

  public selectConnection = (selectedConnectionId: any) => {
    this.setState({
      modalOpen: true,
      selectedConnectionId,
    });
  }

  public createNewConnection = () => {
    this.setState({ modalOpen: !this.state.modalOpen });
  }

  public requestCloseModal = () => {
    this.setState({
      modalOpen: !this.state.modalOpen,
      selectedConnectionId: null,
    });
  }

  public handleCloseModal = (): void => {
    this.setState({
      modalOpen: false,
      selectedConnectionId: null,
    });
  }

  public handleSaveChange = (newConnection: any, codeList: boolean = false): void => {

    ApiActionDispatchers.addApiConnection(newConnection);
    this.handleCloseModal();
  }

  public handleDeleteConnection = (connectionId: any): void => {
    ApiActionDispatchers.delApiConnection(connectionId);
    this.handleCloseModal();
  }

  public renderConnections = (): JSX.Element => {
    if (!this.props.connections || Object.getOwnPropertyNames(this.props.connections).length === 0) {
      return null;
    }

    return (
      <>
        {Object.keys(this.props.connections).map((key: any, index: number) => (
          <div className='a-topTasks' key={index}>
            <button
              type='button'
              className='a-btn a-btn-icon a-btn-transparentWhite'
              onClick={this.selectConnection.bind(this, key)}
            >
              <i className='fa fa-settings a-btn-icon-symbol' />
              <span className='a-btn-icon-text'>
                {this.props.connections[key].externalApiId ?
                  this.props.externalApisById[this.props.connections[key].externalApiId].shortname : null}
                {this.props.connections[key].codeListId ? this.props.connections[key].codeListId : null}
              </span>
            </button>

          </div>
        ))}
      </>
    );
  }

  public render(): JSX.Element {
    return (
      <>
        <p className='a-fontSizeS mt-2 mb-1'>
          {this.props.language.ux_editor.api_connection_header}
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
          ariaHideApp={false}
          isOpen={this.state.modalOpen}
          onRequestClose={this.requestCloseModal}
          className='react-modal a-modal-content-target a-page a-current-page modalPage'
          overlayClassName='react-modal-overlay '
        >
          {this.state.selectedConnectionId ?
            <ApiConfigurationComponent
              connectionId={this.state.selectedConnectionId}
              saveEdit={this.handleSaveChange}
              cancelEdit={this.handleCloseModal}
              deleteConnection={this.handleDeleteConnection}
              language={this.props.language}
            />
            :
            <ApiConfigurationComponent
              saveEdit={this.handleSaveChange}
              cancelEdit={this.handleCloseModal}
              deleteConnection={(connectionId: any) => this.handleDeleteConnection(connectionId)}
              language={this.props.language}
            />
          }
        </Modal>
        {this.renderConnections()}
      </>
    );
  }
}

const mapStateToProps: (state: IAppState) => IExternalApiModalProps = (state: IAppState) => ({
  connections: state.serviceConfigurations.APIs.connections,
  externalApisById: state.serviceConfigurations.APIs.externalApisById,
  language: state.appData.language.language,
});

export const ExternalApiModalComponent = connect(mapStateToProps)(ExternalApiModal);
