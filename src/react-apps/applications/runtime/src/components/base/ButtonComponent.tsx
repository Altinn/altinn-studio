import * as React from 'react';
import FormDataActions from './../../../src/features/form/data/actions/index';
import { IAltinnWindow } from './../../types';
export interface IButtonProps {
  id: string;
  text: string;
  disabled: boolean;
  handleDataChange: (value: any) => void;
  unsavedChanges: boolean;
  formDataCount: number;
  validationResults: any;
}

export interface IButtonState { }

export class ButtonComponent extends React.Component<IButtonProps, IButtonState> {
  public renderSubmitButton = () => {
    const disabled = (this.props.formDataCount > 0 &&
      (this.props.validationResults !== null && Object.keys(this.props.validationResults).length !== 0))
      || this.props.unsavedChanges || this.props.formDataCount === 0;
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
    const disabled = !this.props.unsavedChanges;
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
    FormDataActions.submitFormData(
      `${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${instanceId}`,
      'Complete',
    );
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
