import * as React from 'react';
import * as Modal from 'react-modal';
import { connect } from 'react-redux';
import FormActionDispatcher from '../actions/formDesignerActions/formDesignerActionDispatcher';
import components from '../components';
import { EditModalContent } from '../components/config/EditModalContent';
import { ConditionalRenderingModalComponent } from '../components/toolbar/ConditionalRenderingModal';
import { ExternalApiModalComponent } from '../components/toolbar/ExternalApiModal';
import { RuleModalComponent } from '../components/toolbar/RuleModalComponent';

export interface IToolbarElement {
  label: string;
  actionMethod: () => void;
}

export enum LayoutItemType {
  Container = 'CONTAINER',
  Component = 'COMPONENT',
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
  public toolbarComponents: IToolbarElement[] = components.map((c: any) => {
    const customProperties = c.customProperties ? c.customProperties : {};
    return {
      label: c.name,
      actionMethod: () => {
        FormActionDispatcher.addFormComponent({
          component: c.name,
          itemType: LayoutItemType.Component,
          title: c.name,
          ...JSON.parse(JSON.stringify(customProperties)),
        }, null, (component: any, id: string) => {
          this.handleNext(component, id);
        },
        );
      },
    } as IToolbarElement;
  });


  constructor(props: IToolbarProps, state: IToolbarState) {
    super(props, state);
    this.state = {
      modalOpen: false,
      selectedComp: {},
      selectedCompId: '',
    };
  }

  public componentDidMount() {
    const addContainerItem: IToolbarElement = {
      label: 'Add container',
      actionMethod: () => {
        FormActionDispatcher.addFormContainer({
          repeating: false,
          dataModelGroup: null,
        } as ICreateFormContainer,
        );
      },
    };
    this.toolbarComponents.push(addContainerItem);
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
