import type { ReactElement } from 'react';
import { useId } from 'react';
import { StudioRadio, StudioRadioGroup } from '@studio/components';
import { ArrayUtils } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';
import type { EnvironmentEntry } from '../types';
import type { EnvironmentValueControlProps } from '../EnvironmentConfigField';
import { EnvironmentConfigField } from '../EnvironmentConfigField';

/** The BPMN stores booleans as the text `true` / `false`, so the wire value stays a string. */
const trueValue = 'true';
const falseValue = 'false';

/**
 * The runtime reads the text with `bool.Parse`, which trims and ignores case, so
 * `<altinn:disabled env="tt02">True</altinn:disabled>` is a legal file that means true. Studio has
 * to read it the same way: a panel that showed "Nei" for it would assert the opposite of the file.
 * The value written back is always the lower-case spelling.
 */
const parseBooleanValue = (value: string): boolean | undefined => {
  const parsedValue = value.trim().toLowerCase();
  if (parsedValue === trueValue) return true;
  if (parsedValue === falseValue) return false;
  return undefined;
};

/**
 * The values in the file that are neither `true` nor `false` and are not blank.
 *
 * A blank one is legal - `AltinnEFormidlingConfiguration` treats it as the default - but anything
 * else reaches `bool.Parse`, which throws, and the app then fails to start. The rows cannot show
 * such a value as an answer and must not present it as one, so the field says outright that the
 * file holds it rather than looking like a field nobody has filled in yet.
 */
const getUnreadableValues = (entries: EnvironmentEntry<string>[]): string[] =>
  ArrayUtils.removeDuplicates(
    entries
      .map(({ value }) => value.trim())
      .filter((value) => value !== '' && parseBooleanValue(value) === undefined),
  );

const formatBooleanValue = (
  parsedValue: boolean | undefined,
  trueText: string,
  falseText: string,
): string => {
  if (parsedValue === undefined) return '';
  return parsedValue ? trueText : falseText;
};

export type EnvBooleanConfigFieldProps = {
  label: string;
  description?: string;
  required?: boolean;
  /** Defaults to "Ja". Pass a domain wording when the field reads better as a statement. */
  trueLabel?: string;
  /** Defaults to "Nei". */
  falseLabel?: string;
  entries: EnvironmentEntry<string>[];
  onChange: (entries: EnvironmentEntry<string>[]) => void;
};

/**
 * A yes/no value that can be overridden per environment.
 *
 * A radio group rather than a toggle group, because a newly added override has no value yet and a
 * toggle group cannot render "nothing chosen" - it would show a default the BPMN does not contain.
 */
export const EnvBooleanConfigField = ({
  trueLabel,
  falseLabel,
  ...props
}: EnvBooleanConfigFieldProps): ReactElement => {
  const { t } = useTranslation();
  const trueText = trueLabel ?? t('general.yes');
  const falseText = falseLabel ?? t('general.no');
  const unreadableValues = getUnreadableValues(props.entries);

  return (
    <EnvironmentConfigField<string>
      {...props}
      emptyValue=''
      isEmptyValue={(value) => parseBooleanValue(value) === undefined}
      // A value that is neither reads as nothing rather than as "Nei": the runtime fails to boot on
      // it, and the summary must not present it as a working answer.
      formatValue={(value) => formatBooleanValue(parseBooleanValue(value), trueText, falseText)}
      warning={
        unreadableValues.length > 0
          ? t('process_editor.configuration_panel.environment_config.unreadable_boolean_alert', {
              count: unreadableValues.length,
              values: unreadableValues.join(', '),
            })
          : undefined
      }
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
