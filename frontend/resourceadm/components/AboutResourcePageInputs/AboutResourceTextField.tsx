import React, { Ref } from 'react';
import classes from './AboutResourcePageInputs.module.css';
import { TextField, ErrorMessage, Paragraph, Label } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

type AboutResourceTextFieldProps = {
  label: string;
  description: string;
  value: string;
  onChangeValue: (e: string) => void;
  onFocus: () => void;
  id: string;
  isValid: boolean;
  ref?: Ref<HTMLInputElement>;
  onKeyDown?: () => void;
  onBlur: () => void;
  showErrorMessage?: boolean;
  errorText?: string;
};

export const AboutResourceTextField = ({
  label,
  description,
  value,
  onChangeValue,
  onFocus,
  id,
  isValid,
  ref,
  onKeyDown,
  onBlur,
  showErrorMessage = false,
  errorText,
}: AboutResourceTextFieldProps) => {
  const { t } = useTranslation();

  return (
    <>
      <div className={classes.divider} />
      <Label size='medium' spacing htmlFor={id}>
        {t(label)}
      </Label>
      <Paragraph size='small'>{t(description)}</Paragraph>
      <div className={classes.inputWrapper}>
        <TextField
          value={value}
          onChange={(e) => onChangeValue(e.target.value)}
          onFocus={onFocus}
          id={id}
          isValid={isValid}
          ref={ref}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
        {showErrorMessage && (
          <div className={classes.warningCardWrapper}>
            <ErrorMessage size='small'>{errorText}</ErrorMessage>
          </div>
        )}
      </div>
    </>
  );
};
