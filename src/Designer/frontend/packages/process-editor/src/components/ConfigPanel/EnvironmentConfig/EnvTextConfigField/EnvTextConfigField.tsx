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

/** A free-text value that can be overridden per environment. */
export const EnvTextConfigField = (props: EnvTextConfigFieldProps): ReactElement => (
  <EnvironmentConfigField<string>
    {...props}
    emptyValue=''
    isEmptyValue={(value) => !value.trim()}
    formatValue={(value) => value}
    renderValueControl={(controlProps) => <TextValueControl {...controlProps} />}
  />
);

/**
 * `StudioToggleableTextfield` is deliberately not used here: it suppresses blur while an error is
 * set, which traps focus in the row.
 */
const TextValueControl = ({
  label,
  value,
  onChange,
}: EnvironmentValueControlProps<string>): ReactElement => {
  const [localValue, setLocalValue] = usePropState<string>(value);

  // What is committed is the trimmed value. `GetRequiredConfig` only asks that the value is not
  // blank and then hands it to the shipment as it stands, so the spaces a user happened to type
  // around `arkivmelding` would travel all the way to eFormidling. It is also the reading the field
  // already has of its own value: `" "` empties the row, so `" arkivmelding "` cannot be stored
  // padded without the field meaning two different things by a space.
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
