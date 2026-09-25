import type { ReactElement } from 'react';
import { useId } from 'react';
import { StudioRadio, StudioRadioGroup } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { EnvironmentEntry } from '../types';
import type { EnvironmentValueControlProps } from '../EnvironmentConfigField';
import { EnvironmentConfigField } from '../EnvironmentConfigField';

/** The bpmn stores booleans as the text `true` / `false`. */
const trueValue = 'true';
const falseValue = 'false';

/** The runtime parses the text with `bool.Parse`, which trims and ignores case. */
const parseBooleanValue = (value: string): boolean | undefined => {
  const parsedValue = value.trim().toLowerCase();
  if (parsedValue === trueValue) return true;
  if (parsedValue === falseValue) return false;
  return undefined;
};

export type EnvBooleanConfigFieldProps = {
  label: string;
  description?: string;
  required?: boolean;
  trueLabel?: string;
  falseLabel?: string;
  entries: EnvironmentEntry<string>[];
  onChange: (entries: EnvironmentEntry<string>[]) => void;
};

/**
 * A yes/no value that can be overridden per environment. A radio group rather than a switch,
 * because a newly added override has no value yet and a switch cannot show "nothing chosen".
 */
export const EnvBooleanConfigField = ({
  trueLabel,
  falseLabel,
  ...props
}: EnvBooleanConfigFieldProps): ReactElement => {
  const { t } = useTranslation();
  const trueText = trueLabel ?? t('general.yes');
  const falseText = falseLabel ?? t('general.no');

  const formatValue = (value: string): string => {
    const parsedValue = parseBooleanValue(value);
    if (parsedValue === undefined) return '';
    return parsedValue ? trueText : falseText;
  };

  return (
    <EnvironmentConfigField<string>
      {...props}
      canClearValue={false}
      emptyValue=''
      isEmptyValue={(value) => parseBooleanValue(value) === undefined}
      formatValue={formatValue}
      renderValueControl={(controlProps) => (
        <BooleanValueControl {...controlProps} falseLabel={falseText} trueLabel={trueText} />
      )}
    />
  );
};

type BooleanValueControlProps = EnvironmentValueControlProps<string> & {
  trueLabel: string;
  falseLabel: string;
};

const BooleanValueControl = ({
  label,
  value,
  onChange,
  trueLabel,
  falseLabel,
}: BooleanValueControlProps): ReactElement => {
  const radioGroupName = useId();
  const parsedValue = parseBooleanValue(value);

  return (
    <StudioRadioGroup legend={label}>
      <StudioRadio
        checked={parsedValue === true}
        label={trueLabel}
        name={radioGroupName}
        onChange={() => onChange(trueValue)}
        value={trueValue}
      />
      <StudioRadio
        checked={parsedValue === false}
        label={falseLabel}
        name={radioGroupName}
        onChange={() => onChange(falseValue)}
        value={falseValue}
      />
    </StudioRadioGroup>
  );
};
