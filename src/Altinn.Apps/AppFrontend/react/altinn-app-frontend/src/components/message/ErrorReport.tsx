/* eslint-disable react-perf/jsx-no-new-object-as-prop */
/* eslint-disable no-prototype-builtins */
import * as React from 'react';
import { useRef, useEffect } from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { IValidations } from 'src/types';
import { getTextFromAppOrDefault } from '../../utils/textResource';
import { getUnmappedErrors } from '../../utils/validation';
import { useAppSelector } from 'src/common/hooks';

export interface IErrorProps {
  language: any;
}

const ErrorReport = (props: IErrorProps) => {
  const validations = useAppSelector(state => state.formValidations.validations,);
  const unmappedErrors = getUnmappedErrors(validations);
  const hasUnmappedErrors = unmappedErrors.length > 0;
  const textResources = useAppSelector(state => state.textResources.resources);
  const formHasErrors = useAppSelector(state => getFormHasErrors(state.formValidations.validations));
  const hasSubmitted = useAppSelector(state => state.formData.hasSubmitted);
  const errorRef = useRef(null);

  useEffect(() => {
    if (hasSubmitted) {
      errorRef?.current?.focus();
    }
  }, [hasSubmitted, unmappedErrors]);

  if (!formHasErrors) {
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
                <h2
                  className='a-fontReg'
                  style={{ marginBottom: '0px', marginLeft: '12px' }}
                >
                  <span className='a-iconText-text-large'>
                    {getLanguageFromKey(
                      'form_filler.error_report_header',
                      props.language,
                    )}
                  </span>
                </h2>
              </div>
            </div>
            <div
              className='modal-body a-modal-body'
              style={{ paddingTop: '0px', paddingBottom: '24px' }}
            >
              {hasUnmappedErrors &&
                unmappedErrors.map((key: string) => {
                  // List unmapped errors
                  return (
                    <h4
                      className='a-fontReg'
                      style={{ marginBottom: '12px' }}
                      key={key}
                    >
                      <span>
                        {getTextFromAppOrDefault(
                          key,
                          textResources,
                          props.language,
                          undefined,
                          false,
                        )}
                      </span>
                    </h4>
                  );
                })}
              {!hasUnmappedErrors && (
                // No errors to list, show a generic error message
                <h4 className='a-fontReg' style={{ marginBottom: '12px' }}>
                  <span>
                    {getLanguageFromKey(
                      'form_filler.error_report_description',
                      props.language,
                    )}
                  </span>
                </h4>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getFormHasErrors = (validations: IValidations): boolean => {
  let hasErrors = false;
  for (const layout in validations) {
    if (validations.hasOwnProperty(layout)) {
      for (const key in validations[layout]) {
        if (validations[layout].hasOwnProperty(key)) {
          const validationObject = validations[layout][key];
          for (const fieldKey in validationObject) {
            if (validationObject.hasOwnProperty(fieldKey)) {
              const fieldValidationErrors = validationObject[fieldKey].errors;
              if (fieldValidationErrors && fieldValidationErrors.length > 0) {
                hasErrors = true;
                break;
              }
            }
          }
          if (hasErrors) {
            break;
          }
        }
      }
    }
  }
  return hasErrors;
};

export default ErrorReport;
