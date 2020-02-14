import * as React from 'react';
import { connect } from 'react-redux';
import { makeGetValidationsSelector } from '../../selectors/getValidations';
import { IValidations } from '../../types/global';
import FormDataActions from '../../features/form/data/formDataActions';
import { IAltinnWindow, IRuntimeState } from './../../types';
export interface IButtonProvidedProps {
  id: string;
  text: string;
  disabled: boolean;
  handleDataChange: (value: any) => void;
  formDataCount: number;
}

export interface IButtonProps extends IButtonProvidedProps {
  unsavedChanges: boolean;
  validations: IValidations;
}

export interface IButtonState { }

export class ButtonComponentClass extends React.Component<IButtonProps, IButtonState> {
  public renderSubmitButton = () => {
    return (
      <button
        type='submit'
        className={'a-btn a-btn-success'}
        onClick={this.submitForm}
        id={this.props.id}
        style={{ marginBottom: '0' }}
      >
        {this.props.text}
      </button>
    );
  }

  // TODO: Remove saveButton and functions (and sagas) when we have implemented automatic save.
  public renderSaveButton = () => {
    return (
      <button
        type='submit'
        className={'a-btn a-btn-success'}
        onClick={this.saveFormData}
        id='saveBtn'
        style={{ marginBottom: '0' }}
      >
        Lagre
      </button>
    );
  }

  public saveFormData = () => {
    const { org, app, instanceId } = window as Window as IAltinnWindow;
    FormDataActions.submitFormData(
      `${window.location.origin}/${org}/${app}/api/${instanceId}`,
    );
  }

  public submitForm = () => {
    const {org, app, instanceId } = window as Window as IAltinnWindow;
    FormDataActions.submitFormData(
      `${window.location.origin}/${org}/${app}/api/${instanceId}`,
      'Complete',
    );
  }

  public render() {
    return (
      <div className='a-btn-group' style={{ marginTop: '3.6rem', marginBottom: '0' }}>
        {this.renderSaveButton()}
        {this.renderSubmitButton()}
      </div>
    );
  }
}

const makeMapStateToProps = () => {
  const GetValidations = makeGetValidationsSelector();
  const mapStateToProps = (state: IRuntimeState, props: IButtonProvidedProps): IButtonProps => {
    return {
      validations: GetValidations(state),
      unsavedChanges: state.formData.unsavedChanges,
      ...props,
    };
  };
  return mapStateToProps;
};

export const ButtonComponent = connect(makeMapStateToProps)(ButtonComponentClass);
