import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { StudioTextfield } from '@studio/components';
import { usePropState } from '@studio/hooks';
import { useTranslation } from 'react-i18next';
import type { EnvironmentEntry } from '../types';
import type { EnvironmentValueControlProps } from '../EnvironmentConfigField';
import { EnvironmentConfigField } from '../EnvironmentConfigField';
import { getIntegerValueErrorKey } from './integerValidation';

export type EnvIntegerConfigFieldProps = {
  label: string;
  description?: string;
  required?: boolean;
  entries: EnvironmentEntry<string>[];
  onChange: (entries: EnvironmentEntry<string>[]) => void;
};

/** Use text input to match int.TryParse. Number inputs also accept decimals and exponent notation. */
export const EnvIntegerConfigField = (props: EnvIntegerConfigFieldProps): ReactElement => (
  <EnvironmentConfigField<string>
    {...props}
    emptyValue=''
    isEmptyValue={(value) => !value.trim()}
    formatValue={(value) => value}
    renderValueControl={(controlProps) => <IntegerValueControl {...controlProps} />}
  />
);

const IntegerValueControl = ({
  label,
  value,
  onChange,
  onValidityChange,
}: EnvironmentValueControlProps<string>): ReactElement => {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = usePropState<string>(value);
  const errorKey = getIntegerValueErrorKey(localValue);
  const [hasBlurred, setHasBlurred] = useState(!!getIntegerValueErrorKey(value));

  useEffect(() => {
    onValidityChange?.(!errorKey);
  }, [errorKey, onValidityChange]);

  const handleBlur = (): void => {
    setHasBlurred(true);
    onValidityChange?.(!errorKey);
    if (errorKey) return;
    const trimmedValue = localValue.trim();
    setLocalValue(trimmedValue);
    if (trimmedValue !== value) onChange(trimmedValue);
  };

  return (
    <StudioTextfield
      error={hasBlurred && errorKey && t(errorKey)}
      label={label}
      onBlur={handleBlur}
      onChange={(event) => setLocalValue(event.target.value)}
      value={localValue}
    />
  );
};
