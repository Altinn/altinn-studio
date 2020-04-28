import * as React from 'react';
import FormDataActions from '../../features/form/data/formDataActions';
import { IAltinnWindow, IRuntimeState, } from './../../types';
import { useSelector } from 'react-redux';

export interface IButtonProvidedProps {
  id: string;
  text: string;
  disabled: boolean;
  handleDataChange: (value: any) => void;
  formDataCount: number;
}

export function ButtonComponent(props: IButtonProvidedProps) {
  const isSubmitting = useSelector((state: IRuntimeState) => state.formData.isSubmitting);

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

  const renderLoader = () => {
    return (
      <div 
        className="a-loader float-left"
        style={{
          marginLeft: '40px',
          marginTop: '2px',
          height: '45px' // same height as button
        }}
        id={props.id + '-loader'}
      >
        <div className="loader loader-ellipsis"/>
      </div>
    )
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
      {isSubmitting ? renderLoader() : renderSubmitButton()}
    </div>
  );
}
