import * as React from 'react';
import { connect } from 'react-redux';
import { makeGetFormDataSelector } from '../../selectors/getFormData';
import { makeGetValidationsSelector } from '../../selectors/getValidations';
import { IDataModelFieldElement, IValidations } from '../../types/global';
import { canFormBeSaved, getErrorCount } from '../../utils/validation';
import FormDataActions from './../../features/form/data/actions/index';
import { IFormDataState } from './../../features/form/data/reducer';
import { ILayoutState } from './../../features/form/layout/reducer';
import ValidationActions from './../../features/form/validation/actions';
import { IAltinnWindow, IRuntimeState } from './../../types';
export interface IButtonProvidedProps {
  id: string;
  text: string;
  disabled: boolean;
  handleDataChange: (value: any) => void;
  unsavedChanges: boolean;
  formDataCount: number;
}

export interface IButtonProps extends IButtonProvidedProps {
  dataModel: IDataModelFieldElement[];
  allFormData: IFormDataState;
  allValidations: any;
  layout: ILayoutState;
  validations: IValidations;
}

export interface IButtonState { }

export class ButtonComponentClass extends React.Component<IButtonProps, IButtonState> {
  public renderSubmitButton = () => {
    const disabled = (getErrorCount(this.props.validations) > 0) || this.props.unsavedChanges;
    return (
      <button
        type='submit'
        className={disabled ? 'a-btn a-btn-success disabled' : 'a-btn a-btn-success'}
        onClick={this.submitForm}
        disabled={disabled}
        id={this.props.id}
      >
        {this.props.text}
      </button>
    );
  }

  // TODO: Remove saveButton and functions (and sagas) when we have implemented automatic save.
  public renderSaveButton = () => {
    const disabled = !this.props.unsavedChanges || !canFormBeSaved(this.props.validations);
    return (
      <button
        type='submit'
        className={disabled ?
          'a-btn a-btn-success disabled' : 'a-btn a-btn-success'}
        onClick={this.saveFormData}
        disabled={disabled}
        id='saveBtn'
      >
        Lagre
      </button>
    );
  }

  public saveFormData = () => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { reportee, org, service, instanceId } = altinnWindow;
    FormDataActions.submitFormData(
      `${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${instanceId}`,
    );
  }

  public submitForm = () => {
    const { reportee, org, service, instanceId } = window as IAltinnWindow;
    for (const component in this.props.layout) {
      if (component) {
        const key: string = 'simpleBinding';
        const dataModelField = this.props.layout[component].dataModelBindings[key];
        const value = this.props.allFormData.formData[this.props.layout[component].dataModelBindings[key]];
        FormDataActions.updateFormData(dataModelField, (value ? value : ''), this.props.layout[component].id);
      }
    }
    console.log(this.props.allValidations.validations, Object.keys(this.props.allValidations.validations).length === 0);
    // TODO: should wait for validation state
    if (Object.keys(this.props.allValidations.validations).length === 0) {
      FormDataActions.submitFormData(
        `${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${instanceId}`,
        'Complete',
      );
    }
  }

  public render() {
    return (
      <div className='row mt-3'>
        <div className='a-btn-group'>
          {this.renderSaveButton()}
          {this.renderSubmitButton()}
        </div>
      </div>
    );
  }
}

const makeMapStateToProps = () => {
  const GetValidations = makeGetValidationsSelector();
  const GetFormData = makeGetFormDataSelector();
  const mapStateToProps = (state: IRuntimeState, props: IButtonProvidedProps): IButtonProps => {
    return {
      dataModel: state.formDataModel.dataModel,
      allFormData: state.formData,
      allValidations: state.formValidations,
      layout: state.formLayout,
      validations: GetValidations(state),
      ...props,
    };
  };
  return mapStateToProps;
};

export const ButtonComponent = connect(makeMapStateToProps)(ButtonComponentClass);
