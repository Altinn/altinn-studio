import type { ReactElement } from 'react';
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

/**
 * A whole-number value that can be overridden per environment. A text field with a format check
 * rather than a number input, because a number input accepts `3.5` and `3e2` while the runtime
 * parses the text with `int.TryParse`.
 */
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
}: EnvironmentValueControlProps<string>): ReactElement => {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = usePropState<string>(value);
  const errorKey = getIntegerValueErrorKey(localValue);

  // A value that is not a whole number is shown with its error rather than written to the bpmn.
  const handleBlur = (): void => {
    if (errorKey) return;
    const trimmedValue = localValue.trim();
    setLocalValue(trimmedValue);
    if (trimmedValue !== value) onChange(trimmedValue);
  };

  return (
    <StudioTextfield
      error={errorKey && t(errorKey)}
      label={label}
      onBlur={handleBlur}
      onChange={(event) => setLocalValue(event.target.value)}
      value={localValue}
    />
  );
};
