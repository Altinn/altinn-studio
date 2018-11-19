import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import AppDataActionDispatcher from '../actions/appDataActions/appDataActionDispatcher';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import ManageServiceConfigurationDispatchers from '../actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import NavMenu from '../navigation/NavMenu';
import { Preview } from './Preview';
import { Toolbar } from './Toolbar';
export interface IFormDesignerProps { }
export interface IFormDesignerState { }

class FormDesigner extends React.Component<
  IFormDesignerProps,
  IFormDesignerState
  > {
  public componentDidMount() {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const servicePath = `${org}/${service}`;

    FormDesignerActionDispatchers.fetchFormLayout(`${altinnWindow.location.origin}/designer/${servicePath}/React/GetFormLayout`);
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
        Save
      </button>
    );
  }

  public onDragEnd = result => {

    console.log('YOLO from FormDesigner');
    console.log('result: ', result);

    // FormDesignerActionDispatchers.addFormComponent({
    // component: c.name,
    // itemType: LayoutItemType.Component,
    // title: c.name,
    // ...JSON.parse(JSON.stringify('customProperties')),
    // }, null, (component: any, id: string) => {
    // this.handleNext(component, id);
    // },
    // );

    return;
  }

  public render() {
    return (

      <div style={{ display: 'flex', width: '100%', alignItems: 'stretch' }}>
        <NavMenu />
        <div style={{ paddingLeft: 72 }}>
          <div className='container mb-3'>
            <div className='row mt-3'>
              <h1>Form designer</h1>
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

export default FormDesigner;
