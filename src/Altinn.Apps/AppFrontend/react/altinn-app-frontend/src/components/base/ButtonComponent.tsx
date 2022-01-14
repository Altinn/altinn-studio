/* eslint-disable react/prop-types */
import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils/language';
import { AltinnLoader } from 'altinn-shared/components';
import { IAltinnWindow } from '../../types';
import FormDataActions from '../../features/form/data/formDataActions';
import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { ILanguage } from 'altinn-shared/types';

export interface IButtonProvidedProps {
  id: string;
  text: string;
  disabled: boolean;
  handleDataChange: (value: any) => void;
  formDataCount: number;
  language: ILanguage;
}

const buttonStyle = {
  marginBottom: '0',
  width: '100%',
};

const altinnLoaderStyle = {
  marginLeft: '40px',
  marginTop: '2px',
  height: '45px', // same height as button
};

const btnGroupStyle = {
  marginTop: '3.6rem',
  marginBottom: '0',
};

const rowStyle = {
  marginLeft: '0',
};

export function ButtonComponent(props: IButtonProvidedProps) {
  const dispatch = useAppDispatch();
  const autoSave = useAppSelector(state => state.formLayout.uiConfig.autoSave);
  const isSubmitting = useAppSelector(state => state.formData.isSubmitting);
  const isSaving = useAppSelector(state => state.formData.isSaving);
  const ignoreWarnings = useAppSelector(state => state.formData.ignoreWarnings);

  const renderSubmitButton = () => {
    return (
      <div className='pl-0 a-btn-sm-fullwidth'>
        {isSubmitting ? (
          renderLoader()
        ) : (
          <button
            type='submit'
            className='a-btn a-btn-success'
            onClick={submitForm}
            id={props.id}
            style={buttonStyle}
          >
            {props.text}
          </button>
        )}
      </div>
    );
  };

  const renderSaveButton = () => {
    return (
      <div className='col-2 pl-0 a-btn-sm-fullwidth'>
        {isSaving ? (
          renderLoader()
        ) : (
          <button
            type='submit'
            className='a-btn a-btn-success'
            onClick={saveFormData}
            id='saveBtn'
            style={buttonStyle}
          >
            Lagre
          </button>
        )}
      </div>
    );
  };

  const saveFormData = () => {
    dispatch(FormDataActions.submitFormData({}));
  };

  const renderLoader = () => {
    return (
      <AltinnLoader
        srContent={getLanguageFromKey('general.loading', props.language)}
        style={altinnLoaderStyle}
      />
    );
  };

  const submitForm = () => {
    const { org, app, instanceId } = window as Window as IAltinnWindow;
    dispatch(
      FormDataActions.submitFormData({
        url: `${window.location.origin}/${org}/${app}/api/${instanceId}`,
        apiMode: 'Complete',
        stopWithWarnings: !ignoreWarnings,
      }),
    );
  };

  return (
    <div className='container pl-0'>
      <div className='a-btn-group' style={btnGroupStyle}>
        <div className='row' style={rowStyle}>
          {autoSave === false && renderSaveButton()}
          {renderSubmitButton()}
        </div>
      </div>
    </div>
  );
}
