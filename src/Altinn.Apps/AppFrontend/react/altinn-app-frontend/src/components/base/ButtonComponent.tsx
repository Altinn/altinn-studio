/* eslint-disable react/prop-types */
import * as React from 'react';
import { useSelector } from 'react-redux';
import { getLanguageFromKey } from 'altinn-shared/utils/language';
import { AltinnLoader } from 'altinn-shared/components';
import { IAltinnWindow, IRuntimeState } from '../../types';
import FormDataActions from '../../features/form/data/formDataActions';

export interface IButtonProvidedProps {
  id: string;
  text: string;
  disabled: boolean;
  handleDataChange: (value: any) => void;
  formDataCount: number;
  language: any;
}

export function ButtonComponent(props: IButtonProvidedProps) {
  const autoSave = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.autoSave);
  const isSubmitting = useSelector((state: IRuntimeState) => state.formData.isSubmitting);
  const isSaving = useSelector((state: IRuntimeState) => state.formData.isSaving);

  const renderSubmitButton = () => {
    return (
      <div className='col-4 pl-0'>
        {isSubmitting ?
          renderLoader() :
          <button
            type='submit'
            className='a-btn a-btn-success'
            onClick={submitForm}
            id={props.id}
            style={{ marginBottom: '0' }}
          >
            {props.text}
          </button>
        }
      </div>
    );
  };

  const renderSaveButton = () => {
    return (
      <div className='col-2 pl-0'>
        {isSaving ?
          renderLoader() :
          <button
            type='submit'
            className='a-btn a-btn-success'
            onClick={saveFormData}
            id='saveBtn'
            style={{ marginBottom: '0' }}
          >
            Lagre
          </button>
        }
      </div>
    );
  };

  const saveFormData = () => {
    const {
      org, app, instanceId,
    } = window as Window as IAltinnWindow;
    FormDataActions.submitFormData(
      `${window.location.origin}/${org}/${app}/api/${instanceId}`,
    );
  };

  const renderLoader = () => {
    return (
      <AltinnLoader
        srContent={getLanguageFromKey('general.loading', props.language)}
        style={{
          marginLeft: '40px',
          marginTop: '2px',
          height: '45px', // same height as button
        }}
      />
    );
  };

  const submitForm = () => {
    const {
      org, app, instanceId,
    } = window as Window as IAltinnWindow;
    FormDataActions.submitFormData(
      `${window.location.origin}/${org}/${app}/api/${instanceId}`,
      'Complete',
    );
  };

  return (
    <div className='container pl-0'>
      <div className='a-btn-group' style={{ marginTop: '3.6rem', marginBottom: '0' }}>
        <div className='row' style={{ marginLeft: '0' }}>
          {autoSave === false && renderSaveButton()}
          {renderSubmitButton()}
        </div>
      </div>
    </div>
  );
}
