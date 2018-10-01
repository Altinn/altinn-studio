import * as React from 'react';
import { connect } from 'react-redux';
import ApiActionDispatcher from '../actions/apiActions/apiActionDispatcher';
import AppConfigActionDispatcher from '../actions/appDataActions/appDataActionDispatcher';
import FormFillerActionDispatchers from '../actions/formFillerActions/formFillerActionDispatcher';
import ConditionalRenderingActionDispatcher from '../actions/conditionalRenderingActions/conditionalRenderingActionDispatcher';
import { Preview } from './Preview';

export interface IFormFillerProps {
  validationErrors: any[];
  connections: any;
  dataModelElements: IDataModelFieldElement[];
  designMode: boolean;
}

export interface IFormFillerState { }

/**
 * Component responsible for rendering the layout around the
 * form itself.
 */
export class FormFillerComponent extends React.Component<IFormFillerProps, IFormFillerState> {

  public componentDidMount() {
    AppConfigActionDispatcher.setDesignMode(false);
    ConditionalRenderingActionDispatcher.checkIfConditionalRulesShouldRun();
  }

  public componentDidUpdate(prevProps: IFormFillerProps) {
    if (this.props.connections && this.props.dataModelElements && this.props.dataModelElements.length > 0) {
      ApiActionDispatcher.fetchApiListResponse();
    }
  }

  public submitFormData() {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { reportee, org, service, edition, instanceId } = altinnWindow;
    if (window.location.pathname.split('/')[1].toLowerCase() === 'runtime') {
      FormFillerActionDispatchers.submitFormData(`
        ${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${edition}/${instanceId}`);
    }
  }

  public renderSubmitButton = () => {
    return (
      <button
        type='submit'
        className={Object.keys(this.props.validationErrors).length === 0 ?
          'a-btn a-btn-success' : 'a-btn a-btn-success disabled'}
        onClick={this.submitFormData}
      >
        Submit
      </button>
    );
  }

  public render() {
    return (
      <div className='container a-bgWhite pr-3 pl-3 flex-column media-body'>
        <div className='row pt-3'>
          <Preview />
        </div>
        <div className='row mt-3'>
          <div className='col'>
            {this.renderSubmitButton()}
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: IAppState, empty: any): IFormFillerProps => {
  return {
    validationErrors: state.formFiller.validationErrors,
    connections: state.serviceConfigurations.APIs.connections,
    dataModelElements: state.appData.dataModel.model,
    designMode: state.appData.appConfig.designMode
  };
};

export const FormFiller = connect(mapStateToProps)(FormFillerComponent);
