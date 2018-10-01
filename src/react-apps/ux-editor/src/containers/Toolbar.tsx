import * as React from 'react';
import * as Modal from 'react-modal';
import { connect } from 'react-redux';
import FormActionDispatcher from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { EditModalContent } from '../components/config/EditModalContent';
import { ConditionalRenderingModalComponent } from '../components/toolbar/ConditionalRenderingModal';
import { ExternalApiModalComponent } from '../components/toolbar/ExternalApiModal';
import { RuleModalComponent } from '../components/toolbar/RuleModalComponent';

const HEADER: string = 'Header';
const TEXT_INPUT: string = 'Input';
const CHECKBOX: string = 'Checkboxes';
const TEXT_AREA: string = 'TextArea';
const RADIO_BUTTONS: string = 'RadioButtons';
const DROPDOWN: string = 'Dropdown';
const FILE_UPLOAD: string = 'FileUpload';
const SUBMIT_BUTTON: string = 'Submit';

export interface IToolbarElement {
  label: string;
  actionMethod: () => void;
}

export interface IToolbarProps {
  dataModel: IDataModelFieldElement[];
  textResources: ITextResource[];
}
export interface IToolbarState {
  modalOpen: boolean;
  selectedComp: any;
  selectedCompId: string;
}

class ToolbarClass extends React.Component<IToolbarProps, IToolbarState> {
  public toolbarComponents: IToolbarElement[] = [
    {
      label: HEADER,
      actionMethod: () => {
        FormActionDispatcher.addFormComponent({
          component: HEADER,
          title: HEADER,
        }, (component, id) => {
          this.handleNext(component, id);
        },
        );
      },
    },
    {
      label: TEXT_INPUT,
      actionMethod: () => {
        FormActionDispatcher.addFormComponent({
          component: TEXT_INPUT,
          title: TEXT_INPUT,
        }, (component, id) => {
          this.handleNext(component, id);
        },
        );
      },
    },
    {
      label: CHECKBOX,
      actionMethod: () => {
        FormActionDispatcher.addFormComponent({
          component: CHECKBOX,
          title: CHECKBOX,
          options: [{ value: 'value', label: 'label' }],
        }, (component, id) => {
          this.handleNext(component, id);
        },
        );
      },
    },
    {
      label: TEXT_AREA,
      actionMethod: () => {
        FormActionDispatcher.addFormComponent({
          component: TEXT_AREA,
          title: TEXT_AREA,
        }, (component, id) => {
          this.handleNext(component, id);
        },
        );
      },
    },
    {
      label: RADIO_BUTTONS,
      actionMethod: () => {
        FormActionDispatcher.addFormComponent({
          component: RADIO_BUTTONS,
          title: RADIO_BUTTONS,
          options: [{ value: 'value', label: 'label' }],
        }, (component, id) => {
          this.handleNext(component, id);
        },
        );
      },
    },
    {
      label: DROPDOWN,
      actionMethod: () => {
        FormActionDispatcher.addFormComponent({
          component: DROPDOWN,
          title: DROPDOWN,
          options: [{ value: 'value', label: 'label' }],
        }, (component, id) => {
          this.handleNext(component, id);
        },
        );
      },
    },
    {
      label: FILE_UPLOAD,
      actionMethod: () => {
        FormActionDispatcher.addFormComponent({
          component: FILE_UPLOAD,
          title: FILE_UPLOAD,
        }, (component, id) => {
          this.handleNext(component, id);
        },
        );
      },
    },
    {
      label: SUBMIT_BUTTON,
      actionMethod: () => {
        FormActionDispatcher.addFormComponent({
          component: SUBMIT_BUTTON,
          title: SUBMIT_BUTTON,
          textResourceId: 'Standard.Button.Submit',
          customType: 'Standard',
        }, (component, id) => {
          this.handleNext(component, id);
        },
        );
      },
    },
  ];

  constructor(props: IToolbarProps, state: IToolbarState) {
    super(props, state);
    this.state = {
      modalOpen: false,
      selectedComp: {},
      selectedCompId: '',
    };
  }

  public handleNext(component: any, id: string) {
    this.setState({
      selectedComp: component,
      selectedCompId: id,
      modalOpen: true,
    });
  }

  public handleSaveChange = (callbackComponent: FormComponentType): void => {
    this.handleComponentUpdate(callbackComponent);
    this.handleCloseModal();
  }

  public handleComponentUpdate = (updatedComponent: IFormComponent): void => {
    FormActionDispatcher.updateFormComponent(
      updatedComponent,
      this.state.selectedCompId,
    );
  }

  public handleCloseModal = (): void => {
    this.setState({
      modalOpen: false,
    });
  }

  public render() {
    return (
      <div className={'col-sm-3'}>
        <div className='row a-topTasks'>
          {this.toolbarComponents.map((component, index) => {
            return (
              <div className='col col-lg-12' key={index}>
                <button
                  type='button'
                  className={'a-btn a-btn-icon'}
                  onClick={component.actionMethod}
                >
                  <span className='a-btn-icon-text'>
                    {component.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <div className='d-block'>
          <ExternalApiModalComponent />
        </div>
        <div className='d-block'>
          <RuleModalComponent />
        </div>
        <div className='d-block'>
          <ConditionalRenderingModalComponent />
        </div>
        <Modal
          isOpen={this.state.modalOpen}
          onRequestClose={this.handleCloseModal}
          ariaHideApp={false}
          contentLabel={'Input edit'}
          className='react-modal a-modal-content-target a-page a-current-page modalPage'
          overlayClassName='react-modal-overlay '
        >
          <EditModalContent
            component={this.state.selectedComp}
            saveEdit={this.handleSaveChange}
            cancelEdit={this.handleCloseModal}
            dataModel={this.props.dataModel}
            textResources={this.props.textResources}
          />
        </Modal>
      </div>
    );
  }

}

const mapsStateToProps = (
  state: IAppState,
): IToolbarProps => {
  return {
    dataModel: state.appData.dataModel.model,
    textResources: state.appData.textResources.resources,
  };
};

export const Toolbar = connect(mapsStateToProps)(ToolbarClass);
