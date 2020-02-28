import * as React from 'react';
import FormDataActions from '../../features/form/data/formDataActions';
import { IAltinnWindow, } from './../../types';

export interface IButtonProvidedProps {
  id: string;
  text: string;
  disabled: boolean;
  handleDataChange: (value: any) => void;
  formDataCount: number;
}

export function ButtonComponent(props: IButtonProvidedProps) {


  const renderSubmitButton = () => {
    return (
      <button
        type='submit'
        className={'a-btn a-btn-success'}
        onClick={submitForm}
        id={props.id}
        style={{ marginBottom: '0' }}
      >
        {props.text}
      </button>
    );
  }

  // TODO: Remove saveButton and functions (and sagas) when we have implemented automatic save.
  const renderSaveButton = () => {
    return (
      <button
        type='submit'
        className={'a-btn a-btn-success'}
        onClick={saveFormData}
        id='saveBtn'
        style={{ marginBottom: '0' }}
      >
        Lagre
      </button>
    );
  }

  const saveFormData = () => {
    const { org, app, instanceId } = window as Window as IAltinnWindow;
    FormDataActions.submitFormData(
      `${window.location.origin}/${org}/${app}/api/${instanceId}`,
    );
  }

  const submitForm = () => {
    const {org, app, instanceId } = window as Window as IAltinnWindow;
    FormDataActions.submitFormData(
      `${window.location.origin}/${org}/${app}/api/${instanceId}`,
      'Complete',
    );
  }

  return (
    <div className='a-btn-group' style={{ marginTop: '3.6rem', marginBottom: '0' }}>
      {renderSaveButton()}
      {renderSubmitButton()}
    </div>
  );
}
