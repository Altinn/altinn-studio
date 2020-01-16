import * as React from 'react';
import * as Modal from 'react-modal';
import { connect } from 'react-redux';
import RuleConnectionActionDispatchers from '../../actions/ruleConnectionActions/ruleConnectionActionDispatcher';
import { RuleComponent } from '../config/RuleComponent';

export interface IRuleModalProps {
  ruleConnection: any;
  language: any;
}

export interface IRuleModalState {
  modalOpen: boolean;
  selectedConnectionId: string;
}

class RuleModal extends React.Component<IRuleModalProps, IRuleModalState> {
  public state = {
    modalOpen: false,
    selectedConnectionId: null as any,
  };

  public createNewConnection = () => {
    this.setState({ modalOpen: !this.state.modalOpen });
  }

  public selectConnection = (selectedConnectionId: any) => {
    this.setState({
      modalOpen: !this.state.modalOpen,
      selectedConnectionId,
    });
  }

  public handleCloseModal = (): void => {
    this.setState({
      modalOpen: !this.state.modalOpen,
      selectedConnectionId: null,
    });
  }

  public handleSaveChange = (newConnection: any): void => {
    RuleConnectionActionDispatchers.addRuleConnection(newConnection);
    this.handleCloseModal();
  }

  public handleDeleteConnection = (connectionId: any): void => {
    RuleConnectionActionDispatchers.delRuleConnection(connectionId);
    this.handleCloseModal();
  }

  public renderRuleConnections = (): JSX.Element => {
    if (!this.props.ruleConnection || Object.getOwnPropertyNames(this.props.ruleConnection).length === 0) {
      return null;
    }
    return (
      <>
        {Object.keys(this.props.ruleConnection).map((key: any, index: number) => (
          <div className='a-topTasks' key={index}>
            <button
              type='button'
              className='a-btn a-btn-icon a-btn-transparentWhite'
              onClick={this.selectConnection.bind(this, key)}
            >
              <i className='fa fa-settings a-btn-icon-symbol' />
              <span className='a-btn-icon-text'>
                {this.props.ruleConnection[key].selectedFunction}
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
          {this.props.language.ux_editor.rule_connection_header}
        </p>
        <button
          type='button'
          className='a-btn a-btn-action a-fullWidthBtn a-btnBigger'
          onClick={this.createNewConnection}
          color='primary'
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
          overlayClassName='react-modal-overlay'
        >
          {this.state.selectedConnectionId ?
            <RuleComponent
              connectionId={this.state.selectedConnectionId}
              saveEdit={this.handleSaveChange}
              cancelEdit={this.handleCloseModal}
              deleteConnection={this.handleDeleteConnection}
            />
            :
            <RuleComponent
              saveEdit={this.handleSaveChange}
              cancelEdit={this.handleCloseModal}
              deleteConnection={(connectionId: any) => this.handleDeleteConnection(connectionId)}
            />
          }
        </Modal>
        {this.renderRuleConnections()}
      </>
    );
  }
}

const mapStateToProps: (state: IAppState) => IRuleModalProps = (state: IAppState) => ({
  ruleConnection: state.serviceConfigurations.ruleConnection,
  language: state.appData.language.language,
});

export const RuleModalComponent = connect(mapStateToProps)(RuleModal);
