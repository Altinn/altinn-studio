import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import AppDataActionDispatcher from '../actions/appDataActions/appDataActionDispatcher';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import ManageServiceConfigurationDispatchers from '../actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import components from '../components';
import { Preview } from './Preview';
import { Toolbar } from './Toolbar';

export interface IFormDesignerProps {
  language: any;
}
export interface IFormDesignerState { }

export enum LayoutItemType {
  Container = 'CONTAINER',
  Component = 'COMPONENT',
}

class FormDesigner extends React.Component<
  IFormDesignerProps,
  IFormDesignerState
  > {
  public componentDidMount() {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const servicePath = `${org}/${service}`;

    FormDesignerActionDispatchers.fetchFormLayout(
      `${altinnWindow.location.origin}/designer/${servicePath}/React/GetFormLayout`,
    );
    AppDataActionDispatcher.setDesignMode(true);
  }

  public renderSaveButton = (): JSX.Element => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;

    const handleSaveButton: any = (): any => {
      ManageServiceConfigurationDispatchers.saveJsonFile(
        `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${
        altinnWindow.service}/React/SaveJsonFile?fileName=ServiceConfigurations.json`);

      FormDesignerActionDispatchers.saveFormLayout(
        `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${
        altinnWindow.service
        }/React/SaveFormLayout`,
      );
    };

    return (
      <button type='button' className='a-btn a-btn-success' onClick={handleSaveButton}>
        {this.props.language.general.save}
      </button>
    );
  }

  public handleNext(component: any, id: string) {
    this.setState({
      selectedComp: component,
      selectedCompId: id,
      modalOpen: true,
    });
  }

  public onDragEnd = (result: any) => {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    switch (source.droppableId) {
      case 'ITEMS':
        if (result.draggableId === 'container') {
          FormDesignerActionDispatchers.addFormContainer({
            repeating: false,
            dataModelGroup: '',
          });
        } else if (source.index === 'thirdPartyComponent') {
          // Handle third party components at some time
        } else {
          const c = components[source.index].customProperties;
          const customProperties = !c ? {} : c;
          FormDesignerActionDispatchers.addFormComponent({
            component: components[source.index].name,
            itemType: 'LayoutItemType.Component',
            title: components[source.index].name,
            ...JSON.parse(JSON.stringify(customProperties)),
          },
            destination.index,
            destination.droppableId,
          );
        }
        break;

      default:
        FormDesignerActionDispatchers.updateFormComponentOrderAction(
          result.draggableId,
          destination.index,
          source.index,
          destination.droppableId,
          source.droppableId,
        );
        break;
    }

    return;
  }

  public render() {
    return (
      <div style={{ display: 'flex', width: '100%', alignItems: 'stretch' }}>
        <div style={{ paddingLeft: 72 }}>
          <div className='container mb-3'>
            <div className='row mt-3'>
              <h1>{this.props.language.ux_editor.form_designer}</h1>
            </div>
            <DragDropContext onDragEnd={this.onDragEnd}>
              <div className='row bigger-container mt-3'>
                <Toolbar />
                <div className='col'>
                  <Preview />
                  <div className='col-12 justify-content-center d-flex mt-3'>
                    {this.renderSaveButton()}
                  </div>
                </div>
              </div>
            </DragDropContext>
            <div className='row'>
              <div className='col-3' />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapsStateToProps = (
  state: IAppState,
): IFormDesignerProps => {
  return {
    language: state.appData.language.language,
  };
};

export default connect(mapsStateToProps)(FormDesigner);
