import type { ReactElement } from 'react';
import { StudioTextfield } from '@studio/components';
import { usePropState } from '@studio/hooks';
import type { EnvironmentEntry } from '../types';
import type { EnvironmentValueControlProps } from '../EnvironmentConfigField';
import { EnvironmentConfigField } from '../EnvironmentConfigField';

export type EnvTextConfigFieldProps = {
  label: string;
  description?: string;
  required?: boolean;
  entries: EnvironmentEntry<string>[];
  onChange: (entries: EnvironmentEntry<string>[]) => void;
};

export const EnvTextConfigField = (props: EnvTextConfigFieldProps): ReactElement => (
  <EnvironmentConfigField<string>
    {...props}
    emptyValue=''
    isEmptyValue={(value) => !value.trim()}
    formatValue={(value) => value}
    renderValueControl={(controlProps) => <TextValueControl {...controlProps} />}
  />
);

const TextValueControl = ({
  label,
  value,
  onChange,
}: EnvironmentValueControlProps<string>): ReactElement => {
  const [localValue, setLocalValue] = usePropState<string>(value);

  // Trim before saving because the runtime uses the value without trimming it.
  const handleBlur = (): void => {
    const trimmedValue = localValue.trim();
    setLocalValue(trimmedValue);
    if (trimmedValue !== value) onChange(trimmedValue);
  };

  return (
    <StudioTextfield
      label={label}
      onBlur={handleBlur}
      onChange={(event) => setLocalValue(event.target.value)}
      value={localValue}
    />
  );
};
