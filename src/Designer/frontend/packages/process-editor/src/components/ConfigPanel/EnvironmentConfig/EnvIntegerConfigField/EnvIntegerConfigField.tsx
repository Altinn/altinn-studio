import type { ReactElement } from 'react';
import { StudioTextfield } from '@studio/components';
import { usePropState } from '@studio/hooks';
import type { EnvironmentEntry } from '../types';
import type { EnvironmentValueControlProps } from '../EnvironmentConfigField';
import { EnvironmentConfigField } from '../EnvironmentConfigField';
import { useScrollMessageIntoView } from './useScrollMessageIntoView';
import { useValidateIntegerValue } from './useValidateIntegerValue';

export type EnvIntegerConfigFieldProps = {
  label: string;
  description?: string;
  required?: boolean;
  entries: EnvironmentEntry<string>[];
  onChange: (entries: EnvironmentEntry<string>[]) => void;
};

/**
 * A whole-number value that can be overridden per environment.
 *
 * The value stays a `string` with a format check rather than an `input type='number'`, because the
 * browser accepts `3.5` and `3e2` in a number input while the runtime parses the text with
 * `int.TryParse` and fails to boot on both.
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
  const { validateIntegerValue } = useValidateIntegerValue();
  const [localValue, setLocalValue] = usePropState<string>(value);
  const errorMessage = validateIntegerValue(localValue);
  // The row is what has to be visible, not the input: the message is below the field, and this is
  // the last row of a group that can end past the bottom of the panel.
  const rowRef = useScrollMessageIntoView<HTMLDivElement>(errorMessage);

  // A value that is not a whole number is shown with its error rather than written to the BPMN,
  // where it would only surface as a boot failure. The control stays enabled either way.
  //
  // What is written is the trimmed value, which is also what was validated - the file should not
  // end up with the spaces the user happened to type around the number.
  const handleBlur = (): void => {
    if (errorMessage) return;
    const trimmedValue = localValue.trim();
    setLocalValue(trimmedValue);
    if (trimmedValue !== value) onChange(trimmedValue);
  };

  return (
    <div ref={rowRef}>
      <StudioTextfield
        error={errorMessage}
        label={label}
        onBlur={handleBlur}
        onChange={(event) => setLocalValue(event.target.value)}
        value={localValue}
      />
    </div>
  );
};
