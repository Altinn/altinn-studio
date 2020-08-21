import * as React from 'react';
import { useRef, useEffect } from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { IValidations, ITextResource } from 'src/types';
import { IRuntimeState } from 'src/types';
import { useSelector } from 'react-redux';
import { getTextFromAppOrDefault } from '../../utils/textResource';
import { getUnmappedErrors } from '../../utils/validation';

export interface IErrorProps {
  language: any;
  validations: IValidations;
  textResources: ITextResource[];
  formHasErrors: boolean;
}


const ErrorReport = (props: IErrorProps) => {
  const unmappedErrors = getUnmappedErrors(props.validations);
  const hasUnmappedErrors: boolean = unmappedErrors.length > 0;
  const hasSubmitted = useSelector((state: IRuntimeState) => state.formData.hasSubmitted);
  const errorRef = useRef(null);

  useEffect(() => {
    if (hasSubmitted) {
      // eslint-disable-next-line no-unused-expressions
      errorRef?.current?.focus();
    }
  }, [hasSubmitted, unmappedErrors]);

  if (!props.formHasErrors) {
    return null;
  }

  return (
    <div
      id='errorReport'
      className='a-modal-content-target'
      style={{ marginTop: '55px' }}
      ref={errorRef}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      <div className='a-page a-current-page'>
        <div className='modalPage'>
          <div className='modal-content'>
            <div className='modal-body' style={{ paddingBottom: '0px' }}>
              <div className='a-iconText' style={{ minHeight: '60px' }}>
                <div className='a-iconText-icon'>
                  <i
                    className='ai ai-circle-exclamation a-icon'
                    style={{
                      color: '#E23B53',
                      fontSize: '4em',
                      marginLeft: '12px',
                    }}
                    aria-hidden='true'
                  />
                </div>
                <h2 className='a-fontReg' style={{ marginBottom: '0px', marginLeft: '12px' }}>
                  <span className='a-iconText-text-large'>
                    {getLanguageFromKey('form_filler.error_report_header', props.language)}
                  </span>
                </h2>
              </div>
            </div>
            <div className='modal-body a-modal-body' style={{ paddingTop: '0px', paddingBottom: '24px' }}>
              {hasUnmappedErrors && unmappedErrors.map((key: string) => {
                // List unmapped errors
                return (
                  <h4
                    className='a-fontReg' style={{ marginBottom: '12px' }}
                    key={key}
                  >
                    <span>
                      {getTextFromAppOrDefault(key, props.textResources, props.language, undefined, false)}
                    </span>
                  </h4>
                );
              })}
              {!hasUnmappedErrors &&
                // No errors to list, show a generic error message
                <h4 className='a-fontReg' style={{ marginBottom: '12px' }}>
                  <span>
                    {getLanguageFromKey('form_filler.error_report_description', props.language)}
                  </span>
                </h4>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorReport;
