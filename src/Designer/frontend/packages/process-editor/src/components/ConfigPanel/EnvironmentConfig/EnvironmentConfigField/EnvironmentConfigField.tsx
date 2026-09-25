import type { ReactElement } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioButton,
  StudioDeleteButton,
  StudioDisplayTile,
  StudioDropdown,
  StudioLabelWrapper,
  StudioParagraph,
  StudioProperty,
} from '@studio/components';
import { PlusIcon, XMarkIcon } from '@studio/icons';
import classes from './EnvironmentConfigField.module.css';
import type { AltinnEnvironment } from '../altinnEnvironments';
import { altinnEnvironments } from '../altinnEnvironments';
import type { EnvironmentEntry, EnvironmentScope } from '../types';
import { globalScope } from '../types';
import type { CombineDuplicateValues } from '../environmentEntryUtils';
import {
  findOverrideEntry,
  getEnvironmentScopeTextKey,
  getUnknownEnvironmentNames,
  resolveEnvironmentEntries,
  withEnvironmentValue,
  withoutEntry,
  withoutEnvironmentValue,
} from '../environmentEntryUtils';

export type EnvironmentValueControlProps<TValue> = {
  label: string;
  value: TValue;
  onChange: (value: TValue) => void;
};

export type EnvironmentConfigFieldProps<TValue> = {
  label: string;
  description?: string;
  required?: boolean;
  entries: EnvironmentEntry<TValue>[];
  emptyValue: TValue;
  isEmptyValue: (value: TValue) => boolean;
  formatValue: (value: TValue) => string;
  /** How the runtime folds several entries of one environment. Left out when the last one wins. */
  combineDuplicateValues?: CombineDuplicateValues<TValue>;
  /**
   * Whether the value control can express the empty value itself. A radio group cannot, so the
   * environment-independent row then gets a delete button instead. Defaults to true.
   */
  canClearValue?: boolean;
  renderValueControl: (props: EnvironmentValueControlProps<TValue>) => ReactElement;
  onChange: (entries: EnvironmentEntry<TValue>[]) => void;
};

/**
 * A value that applies to every environment and can be overridden per environment. Takes and
 * returns plain `EnvironmentEntry` lists; the `Env*ConfigField` wrappers bind it to a value type.
 */
export function EnvironmentConfigField<TValue>({
  label,
  description,
  required,
  entries,
  emptyValue,
  isEmptyValue,
  formatValue,
  combineDuplicateValues,
  canClearValue = true,
  renderValueControl,
  onChange,
}: EnvironmentConfigFieldProps<TValue>): ReactElement {
  const { t } = useTranslation();
  const descriptionId = useId();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [focusTarget, setFocusTarget] = useState<{ scope?: EnvironmentScope }>();
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const summaryRef = useRef<HTMLButtonElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget.scope === undefined) {
      summaryRef.current?.focus();
    } else {
      const control =
        rowRef.current?.querySelector<HTMLInputElement>('input:checked') ??
        rowRef.current?.querySelector<HTMLElement>('input, textarea, select');
      control?.focus();
    }
  }, [focusTarget]);
  // Overrides added or cleared in the panel but not yet given a value. An empty override would
  // shadow the global value, so they stay out of the bpmn until they have content.
  const [draftEnvironments, setDraftEnvironments] = useState<AltinnEnvironment[]>([]);

  const resolved = resolveEnvironmentEntries(entries, combineDuplicateValues);
  const unknownEnvironments = getUnknownEnvironmentNames(resolved);

  const findEntry = (scope: EnvironmentScope): EnvironmentEntry<TValue> | undefined =>
    scope === globalScope ? resolved.global : findOverrideEntry(resolved, scope);

  const addDraft = (environment: AltinnEnvironment): void =>
    setDraftEnvironments((drafts) =>
      drafts.includes(environment) ? drafts : [...drafts, environment],
    );

  const removeDraft = (environment: AltinnEnvironment): void =>
    setDraftEnvironments((drafts) => drafts.filter((draft) => draft !== environment));

  const collapse = (): void => {
    const invalidControl = fieldsetRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (invalidControl) {
      invalidControl.focus();
      return;
    }
    setFocusTarget({});
    setDraftEnvironments([]);
    setIsExpanded(false);
  };

  const handleValueChange = (scope: EnvironmentScope, value: TValue): void => {
    if (isEmptyValue(value)) {
      if (scope !== globalScope) addDraft(scope);
      if (findEntry(scope)) onChange(withoutEnvironmentValue(entries, scope));
      return;
    }
    if (scope !== globalScope) removeDraft(scope);
    onChange(withEnvironmentValue(entries, scope, value, !!combineDuplicateValues));
  };

  const handleRemove = (scope: EnvironmentScope): void => {
    setFocusTarget({ scope: globalScope });
    if (scope !== globalScope) removeDraft(scope);
    if (findEntry(scope)) onChange(withoutEnvironmentValue(entries, scope));
  };

  const overrideEnvironments = altinnEnvironments.filter(
    (environment) => findEntry(environment) || draftEnvironments.includes(environment),
  );
  const availableEnvironments = altinnEnvironments.filter(
    (environment) => !overrideEnvironments.includes(environment),
  );

  const getSummaryText = (): string | undefined => {
    const overrideCount = resolved.overrides.length + unknownEnvironments.length;
    const value = resolved.global ? formatValue(resolved.global.value) : '';
    if (!value) {
      return overrideCount === 0
        ? undefined
        : t('process_editor.configuration_panel.environment_config.summary_overrides', {
            count: overrideCount,
          });
    }
    return overrideCount === 0
      ? value
      : t('process_editor.configuration_panel.environment_config.summary_value_with_overrides', {
          value,
          count: overrideCount,
        });
  };

  if (!isExpanded) {
    return (
      <StudioProperty.Button
        ref={summaryRef}
        onClick={() => {
          setIsExpanded(true);
          setFocusTarget({ scope: globalScope });
        }}
        property={label}
        value={getSummaryText()}
      />
    );
  }

  const renderRemoveButton = (scope: EnvironmentScope): ReactElement | null => {
    if (scope === globalScope && (canClearValue || !resolved.global)) return null;
    const title =
      scope === globalScope
        ? t('process_editor.configuration_panel.environment_config.remove_global_value')
        : t('general.delete_item', { item: t(getEnvironmentScopeTextKey(scope)) });
    return (
      <StudioDeleteButton onDelete={() => handleRemove(scope)} title={title} variant='tertiary' />
    );
  };

  const renderRow = (scope: EnvironmentScope): ReactElement => (
    <div
      className={classes.row}
      key={scope}
      ref={scope === focusTarget?.scope ? rowRef : undefined}
    >
      <div className={classes.control}>
        {renderValueControl({
          label: t(getEnvironmentScopeTextKey(scope)),
          value: findEntry(scope)?.value ?? emptyValue,
          onChange: (value: TValue) => handleValueChange(scope, value),
        })}
      </div>
      {renderRemoveButton(scope)}
    </div>
  );

  // Studio has no row to move an unknown environment to, so its entry is shown as it is and can
  // only be removed.
  const renderUnknownEntryRow = (entry: EnvironmentEntry<TValue>, index: number): ReactElement => (
    <div className={classes.row} key={`${entry.env}-${index}`}>
      <div className={classes.control}>
        <StudioDisplayTile label={entry.env} value={formatValue(entry.value)} />
      </div>
      <StudioDeleteButton
        onDelete={() => onChange(withoutEntry(entries, entry))}
        title={t('general.delete_item', { item: entry.env })}
        variant='tertiary'
      />
    </div>
  );

  return (
    <StudioProperty.Fieldset
      ref={fieldsetRef}
      compact
      aria-describedby={descriptionId}
      legend={
        <StudioLabelWrapper
          required={required}
          tagText={required ? t('general.required') : undefined}
        >
          {label}
        </StudioLabelWrapper>
      }
      menubar={
        <StudioButton
          aria-label={t('general.close_item', { item: label })}
          title={t('general.close_item', { item: label })}
          icon={<XMarkIcon />}
          onClick={collapse}
          variant='tertiary'
        />
      }
    >
      <div className={classes.content}>
        <StudioParagraph className={classes.description} id={descriptionId}>
          {description && <>{description} </>}
          {t('process_editor.configuration_panel.environment_config.default_description')}
        </StudioParagraph>
        {unknownEnvironments.length > 0 && (
          <StudioAlert data-color='warning'>
            {t('process_editor.configuration_panel.environment_config.unknown_environments_alert', {
              count: unknownEnvironments.length,
              environments: unknownEnvironments.join(', '),
            })}
          </StudioAlert>
        )}
        {resolved.duplicateEntries.length > 0 && (
          <StudioAlert data-color='warning'>
            {t(
              combineDuplicateValues
                ? 'process_editor.configuration_panel.environment_config.combined_environments_alert'
                : 'process_editor.configuration_panel.environment_config.duplicate_environments_alert',
            )}
          </StudioAlert>
        )}
        <div className={classes.rows}>
          {renderRow(globalScope)}
          {overrideEnvironments.map(renderRow)}
          {resolved.unknownEntries.map(renderUnknownEntryRow)}
          {availableEnvironments.length > 0 && (
            <StudioDropdown
              icon={<PlusIcon />}
              triggerButtonText={t(
                'process_editor.configuration_panel.environment_config.add_override',
              )}
              triggerButtonVariant='tertiary'
            >
              <StudioDropdown.List>
                {availableEnvironments.map((environment) => (
                  <StudioDropdown.Item key={environment}>
                    <StudioDropdown.Button
                      onClick={() => {
                        addDraft(environment);
                        setFocusTarget({ scope: environment });
                      }}
                    >
                      {t(getEnvironmentScopeTextKey(environment))}
                    </StudioDropdown.Button>
                  </StudioDropdown.Item>
                ))}
              </StudioDropdown.List>
            </StudioDropdown>
          )}
        </div>
      </div>
    </StudioProperty.Fieldset>
  );
}
