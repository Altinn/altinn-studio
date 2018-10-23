import * as React from 'react';
import AppDataActionDispatcher from '../actions/appDataActions/appDataActionDispatcher';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import ManageServiceConfigurationDispatchers from '../actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
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
    const { org, service, edition } = altinnWindow;
    const serviceEditionPath = `${org}/${service}/${edition}`;

    FormDesignerActionDispatchers.fetchFormLayout(`${altinnWindow.location.origin}/designer/${serviceEditionPath}/React/GetFormLayout`);
    AppDataActionDispatcher.setDesignMode(true);
  }

  public renderSaveButton = (): JSX.Element => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;

    const handleSaveButton: any = (): any => {
      ManageServiceConfigurationDispatchers.saveJsonFile(
        `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${
        altinnWindow.service}/${altinnWindow.edition}/React/SaveJsonFile?fileName=ServiceConfigurations.json`);

      FormDesignerActionDispatchers.saveFormLayout(
        `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${
        altinnWindow.service
        }/${altinnWindow.edition}/React/SaveFormLayout`,
      );
    };

    return (
      <button type='button' className='a-btn a-btn-success' onClick={handleSaveButton}>
        Save
      </button>
    );
  }

  public render() {
    return (
      <div className='container mb-3'>
        <div className='row mt-3'>
          <h1>Form designer</h1>
        </div>
        <div className='row bigger-container mt-3'>
          <Toolbar />
          <div className='col'>
            <Preview />
            <div className='col-12 justify-content-center d-flex mt-3'>
              {this.renderSaveButton()}
            </div>
          </div>
        </div>
        <div className='row'>
          <div className='col-3' />

        </div>
      </div>
    );
  }
}

export default FormDesigner;
