import * as React from 'react';
import * as Modal from 'react-modal';
import { connect } from 'react-redux';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { EditModalContent } from '../components/config/EditModalContent';

export interface IEditContainerProvidedProps {
  component: IFormComponent;
  id: string;
}

export interface IEditContainerProps {
  component: IFormComponent;
  id: string;
  dataModel: IDataModelFieldElement[];
  textResources: ITextResource[];
}

export interface IEditContainerState {
  component: IFormComponent;
  isEditModalOpen: boolean;
}

class Edit extends React.Component<IEditContainerProps, IEditContainerState> {
  constructor(_props: IEditContainerProps, _state: IEditContainerState) {
    super(_props, _state);
    this.state = {
      isEditModalOpen: false,
      component: _props.component,
    };
  }

  public handleComponentUpdate = (updatedComponent: IFormComponent): void => {
    FormDesignerActionDispatchers.updateFormComponent(
      updatedComponent,
      this.props.id,
    );
  }

  public handleComponentDelete = (e: any): void => {
    FormDesignerActionDispatchers.deleteFormComponent(this.props.id);
    e.stopPropagation();
  }

  public handleOpenModal = (): void => {
    this.setState({
      isEditModalOpen: true,
    });
  }

  public handleCloseModal = (): void => {
    this.setState({
      isEditModalOpen: false,
    });
  }

  public handleSaveChange = (callbackComponent: FormComponentType): void => {
    this.handleComponentUpdate(callbackComponent);
    this.handleCloseModal();
  }

  public render(): JSX.Element {
    return (
      <>
        <Modal
          isOpen={this.state.isEditModalOpen}
          onRequestClose={this.handleCloseModal}
          ariaHideApp={false}
          contentLabel={'Input edit'}
          className='react-modal a-modal-content-target a-page a-current-page modalPage'
          overlayClassName='react-modal-overlay '
        >
          <EditModalContent
            component={this.props.component}
            saveEdit={this.handleSaveChange}
            cancelEdit={this.handleCloseModal}
            dataModel={this.props.dataModel}
            textResources={this.props.textResources}
          />
        </Modal>
        <div
          className='row a-btn-action align-items-start mb-1'
          style={{ cursor: 'pointer' }}
          onClick={this.handleOpenModal}
        >
          <div className='col-11 mt-3'>
            {this.props.children}
          </div>
          <div className='col-1'>
            <button
              type='button'
              className='a-btn a-btn-icon p-0'
              onClick={this.handleComponentDelete}
            >
              <i className='ai ai-circle-exit a-danger ai-left' />
            </button>
          </div>
        </div>
      </>
    );
  }
}

const mapsStateToProps = (
  state: IAppState,
  props: IEditContainerProvidedProps,
): IEditContainerProps => {
  return {
    component: props.component,
    id: props.id,
    dataModel: state.appData.dataModel.model,
    textResources: state.appData.textResources.resources,
  };
};

export const EditContainer = connect(mapsStateToProps)(Edit);
