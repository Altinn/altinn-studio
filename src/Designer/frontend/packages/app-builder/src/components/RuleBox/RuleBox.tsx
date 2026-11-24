import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { StudioButton, StudioChip, StudioTextfield } from '@designer/components';
import { TrashIcon } from '@designer/icons';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import type { LayoutComponent } from '../../types';
import { getAllComponents } from '../../utils/layoutUtils';
import { getComponentText, hasAnswer } from '../../utils/componentUtils';
import { resolveOptions } from '../../utils/optionUtils';
import type { ResolvedOption } from '../../utils/optionUtils';
import { changeOperator, ruleOperators } from '../../utils/ruleUtils';
import type { Rule, RuleOperator } from '../../utils/ruleUtils';
import classes from './RuleBox.module.css';

export type RuleKind = 'show' | 'required';

export type RuleBoxProps = {
  kind: RuleKind;
  rule: Rule;
  onChange: (rule: Rule) => void;
  onDelete: () => void;
  /** The component or page the rule belongs to, which cannot be a condition for itself. */
  ownerId?: string;
};

/**
 * Edits a rule as a sentence: "Show only when <field> <is> <value>". Values are chosen from the
 * field's options when it has some, and typed otherwise.
 */
export function RuleBox({ kind, rule, onChange, onDelete, ownerId }: RuleBoxProps): ReactElement {
  const { t } = useTranslation();
  const { layouts, texts, codeLists } = useAppBuilder();
  const fields = getAllComponents(layouts).filter(
    (component) => hasAnswer(component) && component.id !== ownerId,
  );
  const field = fields.find(({ id }) => id === rule.componentId);
  const options = field ? resolveOptions(field, texts, codeLists) : [];

  const handleFieldChange = (componentId: string): void => {
    const newField = fields.find(({ id }) => id === componentId);
    const firstValue = newField ? (resolveOptions(newField, texts, codeLists)[0]?.value ?? '') : '';
    onChange({ ...rule, componentId, values: [firstValue] });
  };

  return (
    <div className={cn(classes.ruleBox, classes[kind])} data-size='sm'>
      <div className={classes.header}>
        <span className={classes.title}>{t(`app_builder.rule.${kind}.title`)}</span>
        <StudioButton
          variant='tertiary'
          data-size='sm'
          icon={<TrashIcon />}
          aria-label={t(`app_builder.rule.${kind}.delete`)}
          title={t(`app_builder.rule.${kind}.delete`)}
          onClick={onDelete}
        />
      </div>
      <div className={classes.condition}>
        <select
          className={cn('ds-input', classes.fieldSelect)}
          aria-label={t('app_builder.rule.field')}
          value={rule.componentId}
          onChange={(event) => handleFieldChange(event.target.value)}
        >
          {!field && <option value={rule.componentId}>{t('app_builder.rule.choose_field')}</option>}
          {fields.map((component) => (
            <option key={component.id} value={component.id}>
              {getFieldName(component, texts, t)}
            </option>
          ))}
        </select>
        <select
          className={cn('ds-input', classes.operatorSelect)}
          aria-label={t('app_builder.rule.operator')}
          value={rule.operator}
          onChange={(event) => onChange(changeOperator(rule, event.target.value as RuleOperator))}
        >
          {ruleOperators.map((operator) => (
            <option key={operator} value={operator}>
              {t(`app_builder.rule.operator.${operator}`)}
            </option>
          ))}
        </select>
        {rule.operator !== 'oneOf' && (
          <SingleValue rule={rule} options={options} onChange={onChange} />
        )}
      </div>
      {rule.operator === 'oneOf' && (
        <ValueChips rule={rule} options={options} onChange={onChange} />
      )}
    </div>
  );
}

function getFieldName(
  component: LayoutComponent,
  texts: Record<string, string>,
  t: (key: string) => string,
): string {
  return getComponentText(component, texts) ?? t(`app_builder.component_type.${component.type}`);
}

type ValueProps = {
  rule: Rule;
  options: ResolvedOption[];
  onChange: (rule: Rule) => void;
};

function SingleValue({ rule, options, onChange }: ValueProps): ReactElement {
  const { t } = useTranslation();
  const value = rule.values[0] ?? '';
  if (options.length === 0) {
    return (
      <StudioTextfield
        key={rule.componentId}
        className={classes.valueInput}
        aria-label={t('app_builder.rule.value')}
        defaultValue={value}
        onBlur={(event) => onChange({ ...rule, values: [event.target.value] })}
      />
    );
  }
  return (
    <select
      className={cn('ds-input', classes.valueSelect)}
      aria-label={t('app_builder.rule.value')}
      value={value}
      onChange={(event) => onChange({ ...rule, values: [event.target.value] })}
    >
      {!options.some((option) => option.value === value) && <option value={value}>{value}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ValueChips({ rule, options, onChange }: ValueProps): ReactElement {
  const { t } = useTranslation();
  if (options.length === 0) {
    return (
      <StudioTextfield
        label={t('app_builder.rule.values_comma_separated')}
        defaultValue={rule.values.join(', ')}
        onBlur={(event) =>
          onChange({ ...rule, values: event.target.value.split(',').map((value) => value.trim()) })
        }
      />
    );
  }
  const toggle = (value: string): void => {
    const values = rule.values.includes(value)
      ? rule.values.filter((current) => current !== value)
      : [...rule.values.filter(Boolean), value];
    onChange({ ...rule, values });
  };
  return (
    <div className={classes.chips} role='group' aria-label={t('app_builder.rule.value')}>
      {options.map((option) => (
        <StudioChip.Checkbox
          key={option.value}
          checked={rule.values.includes(option.value)}
          onChange={() => toggle(option.value)}
        >
          {option.label}
        </StudioChip.Checkbox>
      ))}
    </div>
  );
}
