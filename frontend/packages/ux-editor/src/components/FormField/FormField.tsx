import React, { useCallback, useEffect, useState } from 'react';
import { ErrorMessage } from '@digdir/design-system-react';
import classes from './FormField.module.css';
import { useText } from '../../hooks';
import { validateProperty, isPropertyRequired } from '../../utils/formLayoutUtils';
import { TranslationKey } from 'language/type';
import { useLayoutSchemaQuery } from '../../hooks/queries/useLayoutSchemaQuery';

export type FormFieldChildProps<TT> = {
  errorCode: string;
  value: any;
  label: string;
  onChange: (value: TT, event?: React.ChangeEvent<HTMLInputElement>) => void;
  customRequired: boolean;
}

export interface FormFieldProps<T, TT> {
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

  const { data: layoutSchema } = useLayoutSchemaQuery();

  const [propertyId] = useState(propertyPath ? `${layoutSchema.$id}#/${propertyPath}`: null);
  const [isRequired] = useState(customRequired || (propertyPath ? isPropertyRequired(layoutSchema, propertyPath) : false));

  const validate = useCallback((newValue: T | TT) => {
    if (newValue === undefined || newValue === null || newValue === '') {
      return isRequired ? 'required' : null;
    }

    if (customValidationRules) {
      const customValidation = customValidationRules(newValue);
      if (customValidation) return customValidation;
    }

    if (propertyId) return validateProperty(newValue, propertyId);

    return null;
  }, [customValidationRules, isRequired, propertyId]);

  const [tmpValue, setTmpValue] = useState<T | TT>(value);
  const [errorCode, setErrorCode] = useState(validate(value));

  useEffect(() => {
    setTmpValue(value);
  }, [value, id]);

  const handleOnTextFieldChange = (newValue: TT, event?: React.ChangeEvent<HTMLInputElement>): void => {
    const errCode = validate(newValue);
    setErrorCode(errCode);
    if (!errCode) onChange(newValue, event, errorCode);
    setTmpValue(newValue);
  };

  const renderChildren = (childList: React.ReactNode) => {
    let textFieldLabel: string;
    if (label) textFieldLabel = `${label}${isRequired ? ' *' : ''}`;

    return React.Children.map(childList, (child) => {
      if (React.isValidElement(child)) {
        const props = !['span', 'div'].includes(child.type.toString()) ? {
          value: tmpValue,
          required: isRequired,
          label: textFieldLabel,
          onChange: handleOnTextFieldChange,
          isValid: !errorCode,
          ...child.props,
        } : {};

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
        onChange: handleOnTextFieldChange,
        customRequired: isRequired
      }))}
      {errorCode && (
        <ErrorMessage className={classes.errorMessageText} size="small">
          {showErrorMessages()}
        </ErrorMessage>
      )}
    </div>
  );
};
