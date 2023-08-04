import React, { useCallback, useEffect, useState } from 'react';
import { ErrorMessage } from '@digdir/design-system-react';
import classes from './FormField.module.css';
import { useText } from '../../../../ux-editor/src/hooks';
import { validateProperty, isPropertyRequired } from '../../../../ux-editor/src/utils/formValidationUtils';
import { TranslationKey } from 'language/type';
import { JsonSchema } from 'app-shared/types/JsonSchema';

export type FormFieldChildProps<TT> = {
  errorCode: string;
  value: any;
  label: string;
  onChange: (value: TT, event?: React.ChangeEvent<HTMLInputElement>) => void;
  customRequired: boolean;
}

export interface FormFieldProps<T, TT> {
  schema?: JsonSchema;
  id?: string;
  className?: string;
  label?: string;
  value: T;
  children: (props: FormFieldChildProps<TT>) => React.ReactNode;
  onChange?: (value: TT, event: React.ChangeEvent<HTMLInputElement>, errorCode: string) => void;
  propertyPath?: string;
  customRequired?: boolean;
  customValidationRules?: (value: T | TT) => string;
  customValidationMessages?: (errorCode: string) => string;
}

export const FormField = <T extends unknown, TT extends unknown>({
  schema,
  id,
  className,
  label,
  value,
  children,
  onChange,
  propertyPath,
  customRequired = false,
  customValidationRules,
  customValidationMessages,
}: FormFieldProps<T, TT>): JSX.Element => {
  const t = useText();

  const [propertyId, setPropertyId] = useState(schema && propertyPath ? `${schema.$id}#/${propertyPath}`: null);
  const [isRequired, setIsRequired] = useState(customRequired || isPropertyRequired(schema, propertyPath));

  const validate = useCallback((newValue: T | TT) => {
    if (newValue === undefined || newValue === null || newValue === '') {
      return isRequired ? 'required' : null;
    }

    if (customValidationRules) {
      const customValidation = customValidationRules(newValue);
      if (customValidation) return customValidation;
    }

    if (propertyId) return validateProperty(propertyId, newValue);

    return null;
  }, [customValidationRules, isRequired, propertyId]);

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
    if (schema) setPropertyId(propertyPath ? `${schema.$id}#/${propertyPath}`: null);
  }, [schema, propertyPath]);

  useEffect(() => {
    setIsRequired(customRequired || isPropertyRequired(schema, propertyPath));
  }, [customRequired, schema, propertyPath]);

  const handleOnChange = (newValue: TT, event?: React.ChangeEvent<HTMLInputElement>): void => {
    const errCode = validate(newValue);
    setErrorCode(errCode);
    if (!errCode) onChange(newValue, event, errorCode);
    setTmpValue(newValue);
  };

  const renderChildren = (childList: React.ReactNode) => {
    let fieldLabel: string;
    if (label) fieldLabel = `${label}${isRequired ? ' *' : ''}`;

    return React.Children.map(childList, (child) => {
      if (React.isValidElement(child)) {
        const props = typeof child.type !== 'string' ? {
          value: tmpValue,
          required: isRequired,
          label: fieldLabel,
          onChange: handleOnChange,
          isValid: !errorCode,
          ...child.props,
        } : {};

        if (errorCode) {
          props['aria-errormessage'] = errorMessageId;
          props['aria-invalid'] = true;
        }

        return React.cloneElement(child, props);
      }
    });
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
      {renderChildren(children({
        errorCode,
        value: tmpValue,
        label,
        onChange: handleOnChange,
        customRequired: isRequired
      }))}
      {errorCode && (
        <ErrorMessage id={errorMessageId} className={classes.errorMessageText} size="small">
          {showErrorMessages()}
        </ErrorMessage>
      )}
    </div>
  );
};
