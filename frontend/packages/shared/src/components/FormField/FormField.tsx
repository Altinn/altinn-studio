import { ErrorMessage } from '@digdir/designsystemet-react';
import { StudioHelpText } from '@studio/components';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { TranslationKey } from 'language/type';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isPropertyRequired, validateProperty } from '../../utils/formValidationUtils';
import classes from './FormField.module.css';

export type RenderFieldArgs<TT> = {
  errorCode: string;
  customRequired: boolean;
  fieldProps: FormFieldChildProps<TT>;
};

export type FormFieldChildProps<TT> = {
  value: any;
  label: string;
  onChange: (value: TT, event?: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  'aria-errormessage'?: string;
  'aria-invalid'?: boolean;
};

export interface FormFieldProps<T, TT> {
  schema?: JsonSchema;
  id?: string;
  className?: string;
  label?: string;
  value: T;
  helpText?: string;
  onChange?: (value: TT, event: React.ChangeEvent<HTMLInputElement>, errorCode: string) => void;
  propertyPath?: string;
  componentType?: string;
  customRequired?: boolean;
  customValidationRules?: (value: T | TT) => string;
  customValidationMessages?: (errorCode: string) => string;
  renderField: (props: RenderFieldArgs<TT>) => React.ReactNode;
}

export const FormField = <T extends unknown, TT extends unknown>({
  schema,
  id,
  className,
  label,
  value,
  onChange,
  propertyPath,
  helpText,
  customRequired = false,
  customValidationRules,
  customValidationMessages,
  renderField,
}: FormFieldProps<T, TT>): JSX.Element => {
  const { t } = useTranslation();

  const [propertyId, setPropertyId] = useState(
    schema && propertyPath ? `${schema.$id}#/${propertyPath}` : null,
  );
  const [isRequired, setIsRequired] = useState(
    customRequired || isPropertyRequired(schema, propertyPath),
  );

  const validate = useCallback(
    (newValue: T | TT) => {
      if (newValue === undefined || newValue === null || newValue === '') {
        return isRequired ? 'required' : null;
      }

      if (customValidationRules) {
        const customValidation = customValidationRules(newValue);
        if (customValidation) return customValidation;
      }

      if (propertyId) return validateProperty(propertyId, newValue);

      return null;
    },
    [customValidationRules, isRequired, propertyId],
  );

  const [tmpValue, setTmpValue] = useState<T | TT>(value);
  const [errorCode, setErrorCode] = useState<string>(validate(value));

  const errorMessageId = `error-${id}`;

  useEffect(() => {
    setTmpValue(value);
  }, [value, id]);

  useEffect(() => {
    setErrorCode(validate(value));
  }, [value, id, schema, validate]);

  useEffect(() => {
    if (schema) setPropertyId(propertyPath ? `${schema.$id}#/${propertyPath}` : null);
  }, [schema, propertyPath]);

  useEffect(() => {
    setIsRequired(customRequired || isPropertyRequired(schema, propertyPath));
  }, [customRequired, schema, propertyPath]);

  const handleOnChange = (newValue: any, event?: React.ChangeEvent<HTMLInputElement>): void => {
    // hacky fix to solve for mix of new and old eventhandling after upgrading designsystemet-react
    if (newValue instanceof Object && 'target' in newValue && 'value' in newValue.target) {
      newValue = newValue.target.value;
    }
    const errCode = validate(newValue);
    setErrorCode(errCode);
    setTmpValue(newValue);
    if (!errCode && onChange) onChange(newValue, event, errorCode);
  };

  const generateProps = (): RenderFieldArgs<TT> => {
    const fieldProps: FormFieldChildProps<TT> = {
      value: tmpValue,
      label,
      onChange: handleOnChange,
    };
    if (errorCode) {
      fieldProps['aria-errormessage'] = errorMessageId;
      fieldProps['aria-invalid'] = true;
    }
    const props: RenderFieldArgs<TT> = {
      fieldProps,
      errorCode,
      customRequired,
    };
    return props;
  };

  const showErrorMessages = () => {
    if (customValidationMessages) {
      const validationMessage = customValidationMessages(errorCode);
      if (validationMessage) return validationMessage;
    }

    const key = `validation_errors.${errorCode}` as TranslationKey;
    const str = t(key);
    if (str !== key) return str;

    return t('validation_errors.pattern');
  };

  return (
    <div className={className}>
      <div className={helpText && classes.container}>
        <div className={classes.formField}>{renderField(generateProps())}</div>
        {helpText && <StudioHelpText aria-label={helpText}>{helpText}</StudioHelpText>}
      </div>
      {errorCode && (
        <ErrorMessage id={errorMessageId} className={classes.errorMessageText} size='small'>
          {showErrorMessages()}
        </ErrorMessage>
      )}
    </div>
  );
};
