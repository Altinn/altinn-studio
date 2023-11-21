import React, { useCallback, useEffect, useState } from 'react';
import { ErrorMessage, HelpText } from '@digdir/design-system-react';
import classes from './FormField.module.css';
import { useText } from '../../../../ux-editor/src/hooks';
import {
  validateProperty,
  isPropertyRequired,
} from '../../../../ux-editor/src/utils/formValidationUtils';
import { TranslationKey } from 'language/type';
import { JsonSchema } from 'app-shared/types/JsonSchema';

export type FormFieldChildProps<TT> = {
  errorCode: string;
  value: any;
  label: string;
  onChange: (value: TT, event?: React.ChangeEvent<HTMLInputElement>) => void;
  customRequired: boolean;
};

export interface FormFieldProps<T, TT> {
  schema?: JsonSchema;
  id?: string;
  className?: string;
  label?: string;
  value: T;
  helpText?: string;
  children: (props: FormFieldChildProps<TT>) => React.ReactNode;
  onChange?: (value: TT, event: React.ChangeEvent<HTMLInputElement>, errorCode: string) => void;
  propertyPath?: string;
  componentType?: string;
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
  helpText,
  customRequired = false,
  customValidationRules,
  customValidationMessages,
}: FormFieldProps<T, TT>): JSX.Element => {
  const t = useText();

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

  const handleOnChange = (newValue: TT, event?: React.ChangeEvent<HTMLInputElement>): void => {
    const errCode = validate(newValue);
    setErrorCode(errCode);
    setTmpValue(newValue);
    if (!errCode && onChange) onChange(newValue, event, errorCode);
  };

  const renderChildren = (items: React.ReactNode, renderItem) => {
    return React.Children.map(items, (child) => {
      if (!React.isValidElement(child)) return child;
      const {
        type: ChildrenComponent,
        props: { children: nestedChildren },
      } = child;
      const props =
        typeof ChildrenComponent !== 'string'
          ? {
              value: tmpValue,
              required: isRequired,
              label,
              onChange: handleOnChange,
              ...child.props,
            }
          : {};

      if (nestedChildren) {
        props.children = renderChildren(nestedChildren, renderItem);
      }
      if (errorCode) {
        props['aria-errormessage'] = errorMessageId;
        props['aria-invalid'] = true;
      }

      return renderItem(ChildrenComponent, props);
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
      <div className={classes.container}>
        <div className={classes.formField}>
          {renderChildren(
            children({
              errorCode,
              value: tmpValue,
              label,
              onChange: handleOnChange,
              customRequired: isRequired,
            }),
            (ChildComponent, props) => (
              <ChildComponent {...props} />
            ),
          )}
        </div>
        <div className={classes.helpTextContainer}>
          {helpText && (
            <HelpText className={classes.helpText} title={helpText}>
              {helpText}
            </HelpText>
          )}
        </div>
      </div>
      {errorCode && (
        <ErrorMessage id={errorMessageId} className={classes.errorMessageText} size='small'>
          {showErrorMessages()}
        </ErrorMessage>
      )}
    </div>
  );
};
