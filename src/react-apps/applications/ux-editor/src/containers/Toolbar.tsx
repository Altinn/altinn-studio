import * as React from 'react';
import * as Modal from 'react-modal';
import { connect } from 'react-redux';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import components from '../components';
import { EditModalContent } from '../components/config/EditModalContent';
import { ConditionalRenderingModalComponent } from '../components/toolbar/ConditionalRenderingModal';
import { ExternalApiModalComponent } from '../components/toolbar/ExternalApiModal';
import { RuleModalComponent } from '../components/toolbar/RuleModalComponent';

import { ToolbarItem } from './ToolbarItem';

import '../styles/toolBar.css';

const THIRD_PARTY_COMPONENT: string = 'ThirdParty';

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
  thirdPartyComponents: any;
  activeContainer: string;
  language: any;
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
      actionMethod: (position: number, containerId?: string) => {
        FormDesignerActionDispatchers.addFormComponent({
          component: c.name,
          itemType: LayoutItemType.Component,
          title: c.name,
          ...JSON.parse(JSON.stringify(customProperties)),
        },
          position,
          containerId,
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

  public addContainerToLayout(destinationIndex: number) {
    FormDesignerActionDispatchers.addFormContainer({
      repeating: false,
      dataModelGroup: null,
      index: 0,

    } as ICreateFormContainer,
      null,
      null,
      null,
      destinationIndex,
    );
  }

  public addThirdPartyComponentToLayout = (componentPackage: string, componentName: string) => {
    FormDesignerActionDispatchers.addFormComponent({
      component: THIRD_PARTY_COMPONENT,
      title: `${componentPackage}.${componentName}`,
    },
      null,
    );
  }

  public getThirdPartyComponents = (): IToolbarElement[] => {
    const { thirdPartyComponents } = this.props;
    if (!thirdPartyComponents) {
      return [];
    }
    const thirdPartyComponentArray: IToolbarElement[] = [];
    for (const packageName of thirdPartyComponents) {
      for (const componentName of thirdPartyComponents[packageName]) {
        thirdPartyComponentArray.push({
          label: `${packageName} - ${componentName}`,
          actionMethod: FormDesignerActionDispatchers.addFormComponent({
            component: THIRD_PARTY_COMPONENT,
            title: `${packageName}.${componentName}`,
          },
            null,
          ) as any,
        });
      }
    }
    return thirdPartyComponentArray;
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
    FormDesignerActionDispatchers.updateFormComponent(
      updatedComponent,
      this.state.selectedCompId,
      this.props.activeContainer,
    );
  }

  public handleCloseModal = (): void => {
    this.setState({
      modalOpen: false,
    });
  }

  public setToolbarLabel = (label: any) => {
    if (this.props.language) {
      if (label === 'Header') {
        label = this.props.language.ux_editor.toolbar_header;
      } else if (label === 'FileUpload') {
        label = this.props.language.ux_editor.toolbar_file_upload;
      }
    }
    return label;
  }

  public render() {
    return (
      <div className={'col-sm-12'}>
        {this.toolbarComponents.map((component, index) => (
          <ToolbarItem
            text={component.label}
            onDropAction={component.actionMethod}
          />
        ))
        }
        {
          this.getThirdPartyComponents().map((component, index) => (
            <div
              className='col col-lg-12 a-item'
              id={index.toString()}
              key={index}
            >
              {component.label}
            </div>
          ))
        }
        <ToolbarItem
          text={'add label'}
          onDropAction={() => console.log('drop')}
        />
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
            language={this.props.language}
          />
        </Modal>
      </div >
    );
  }

}

const mapsStateToProps = (
  state: IAppState,
): IToolbarProps => {
  return {
    dataModel: state.appData.dataModel.model,
    textResources: state.appData.textResources.resources,
    thirdPartyComponents: state.thirdPartyComponents.components,
    activeContainer: state.formDesigner.layout.activeContainer,
    language: state.appData.language.language,
  };
};

export const Toolbar = connect(mapsStateToProps)(ToolbarClass);
