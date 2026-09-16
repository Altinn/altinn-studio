import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrayUtils } from '@studio/pure-functions';
import {
  StudioAlert,
  StudioButton,
  StudioDeleteButton,
  StudioDropdown,
  StudioFormGroup,
  StudioProperty,
} from '@studio/components';
import { PlusIcon, XMarkIcon } from '@studio/icons';
import classes from './EnvironmentConfigField.module.css';
import type { AltinnEnvironment } from '../altinnEnvironments';
import { altinnEnvironments } from '../altinnEnvironments';
import type { EnvironmentEntry, EnvironmentScope } from '../types';
import { globalScope } from '../types';
import type { CombineDuplicateValues, EnvironmentConfigSummary } from '../environmentEntryUtils';
import {
  findOverrideEntry,
  getEnvironmentConfigSummary,
  getEnvironmentScopeTextKey,
  resolveEnvironmentEntries,
  withEnvironmentValue,
  withoutEnvironmentValue,
} from '../environmentEntryUtils';

export type EnvironmentValueControlProps<TValue> = {
  /** Rows are labeled by environment, never by field name - the field name is the legend. */
  label: string;
  value: TValue;
  /** Commit. The field turns an empty value into a deleted entry, never into an empty one. */
  onChange: (value: TValue) => void;
};

export type EnvironmentConfigFieldProps<TValue> = {
  label: string;
  description?: string;
  /**
   * Whether the runtime requires a value for the environment it runs in. Rendered once at group
   * level, because "is this field configured?" has no answer - only "for production?" does.
   */
  required?: boolean;
  entries: EnvironmentEntry<TValue>[];
  emptyValue: TValue;
  isEmptyValue: (value: TValue) => boolean;
  formatValue: (value: TValue) => string;
  /**
   * How the runtime folds several entries resolving to the same environment. Left out by a field
   * whose last entry simply wins, which is all of them but eFormidling `dataTypes`.
   */
  combineDuplicateValues?: CombineDuplicateValues<TValue>;
  /**
   * Something in the file the rows cannot show, phrased by the wrapper: only it knows what a value
   * means, while the core only ever sees `TValue`. Shown in the same warning vocabulary as the
   * unknown-environment and duplicate alerts, so that "the file holds something I cannot present"
   * always reads the same way.
   */
  warning?: string;
  renderValueControl: (props: EnvironmentValueControlProps<TValue>) => ReactElement;
  onChange: (entries: EnvironmentEntry<TValue>[]) => void;
};

/**
 * An override row the BPMN has no entry for: one the user has just added, or one they have just
 * cleared. `clearedEnv` is the `env` of the entry the clear removed, so that typing a value again
 * writes the spelling the file had rather than the canonical one.
 */
type EnvironmentDraft = {
  environment: AltinnEnvironment;
  clearedEnv?: string;
};

/**
 * A field whose value can be given once for every environment and then overridden per environment.
 *
 * Deliberately free of bpmn-js: it takes and returns plain `EnvironmentEntry` lists, so all of its
 * rules can be unit-tested without a modeler. Call sites use one of the `Env*ConfigField` wrappers
 * rather than passing `renderValueControl` themselves.
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
  warning,
  renderValueControl,
  onChange,
}: EnvironmentConfigFieldProps<TValue>): ReactElement {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  // Overrides the user has added but not yet given a value. They stay out of the BPMN until they
  // have content, because an empty override shadows the global value and breaks the environment it
  // targets - strictly worse than having no override at all.
  const [drafts, setDrafts] = useState<EnvironmentDraft[]>([]);

  const addDraft = (environment: AltinnEnvironment, clearedEnv?: string): void =>
    setDrafts((currentDrafts) =>
      currentDrafts.some((draft) => draft.environment === environment)
        ? currentDrafts
        : [...currentDrafts, { environment, clearedEnv }],
    );

  const removeDraft = (environment: AltinnEnvironment): void =>
    setDrafts((currentDrafts) =>
      currentDrafts.filter((draft) => draft.environment !== environment),
    );

  const getClearedEnv = (scope: EnvironmentScope): string | undefined =>
    drafts.find((draft) => draft.environment === scope)?.clearedEnv;

  // A draft row is a half-finished gesture, not configuration. Closing the field abandons it, so
  // reopening does not present an override the user never filled in.
  //
  // It abandons the `env` spelling the draft remembered along with it, which is the third and
  // mildest of the cases where Studio writes the canonical name over one the file had: clear a
  // `tt02` override, close the field, reopen it, add the staging override again, and the entry
  // comes back spelled `staging`. The other two are a genuinely new override and a duplicate that
  // consolidation folds away. All three need the user to have removed the entry first.
  const collapse = (): void => {
    setDrafts([]);
    setIsExpanded(false);
  };

  const resolved = resolveEnvironmentEntries(entries, combineDuplicateValues);

  const hasEntry = (scope: EnvironmentScope): boolean =>
    scope === globalScope ? !!resolved.global : !!findOverrideEntry(resolved, scope);

  const getValue = (scope: EnvironmentScope): TValue => {
    const entry = scope === globalScope ? resolved.global : findOverrideEntry(resolved, scope);
    return entry ? entry.value : emptyValue;
  };

  const handleValueChange = (scope: EnvironmentScope, value: TValue): void => {
    if (isEmptyValue(value)) {
      // Keep the row on screen so clearing a value is not the same gesture as removing the row.
      if (scope !== globalScope) addDraft(scope, findOverrideEntry(resolved, scope)?.env);
      if (hasEntry(scope)) onChange(withoutEnvironmentValue(entries, scope));
      return;
    }
    if (scope !== globalScope) removeDraft(scope);
    onChange(
      withEnvironmentValue(entries, scope, value, {
        clearedEnv: getClearedEnv(scope),
        consolidateDuplicates: !!combineDuplicateValues,
      }),
    );
  };

  const handleDelete = (environment: AltinnEnvironment): void => {
    removeDraft(environment);
    if (hasEntry(environment)) onChange(withoutEnvironmentValue(entries, environment));
  };

  const overrideScopes = altinnEnvironments.filter(
    (environment) =>
      hasEntry(environment) || drafts.some((draft) => draft.environment === environment),
  );
  const availableEnvironments = altinnEnvironments.filter(
    (environment) => !overrideScopes.includes(environment),
  );

  // Two entries can carry the same unrecognized spelling, and naming it twice reads like a bug. The
  // count follows the names, so the sentence agrees with the list the user is shown.
  const unknownEnvironments = ArrayUtils.removeDuplicates(
    resolved.unknownEntries.map(({ env }) => env),
  );

  const summaryText = (summary: EnvironmentConfigSummary): string | undefined => {
    switch (summary.kind) {
      case 'empty':
        return undefined;
      case 'globalOnly':
        return summary.value;
      case 'overridesOnly':
        return t('process_editor.configuration_panel.environment_config.summary_overrides', {
          count: summary.overrideCount,
        });
      case 'globalWithOverrides':
        return t(
          'process_editor.configuration_panel.environment_config.summary_value_with_overrides',
          { value: summary.value, count: summary.overrideCount },
        );
    }
  };

  if (!isExpanded) {
    return (
      <StudioProperty.Button
        onClick={() => setIsExpanded(true)}
        property={label}
        value={summaryText(getEnvironmentConfigSummary(resolved, formatValue))}
      />
    );
  }

  const renderRow = (scope: EnvironmentScope): ReactElement => (
    <div className={classes.row} key={scope}>
      <div className={classes.control}>
        {renderValueControl({
          label: t(getEnvironmentScopeTextKey(scope)),
          value: getValue(scope),
          onChange: (value: TValue) => handleValueChange(scope, value),
        })}
      </div>
      {scope !== globalScope && (
        <StudioDeleteButton
          onDelete={() => handleDelete(scope)}
          title={t('general.delete_item', { item: t(getEnvironmentScopeTextKey(scope)) })}
          variant='tertiary'
        />
      )}
    </div>
  );

  return (
    <StudioFormGroup
      legend={label}
      description={description}
      required={required}
      tagText={required ? t('general.required') : undefined}
    >
      {warning && <StudioAlert data-color='warning'>{warning}</StudioAlert>}
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
        {overrideScopes.map(renderRow)}
        {/* Hidden rather than disabled once every environment is in use: the truth is "complete",
            and its honest rendering is absence. */}
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
                  <StudioDropdown.Button onClick={() => addDraft(environment)}>
                    {t(getEnvironmentScopeTextKey(environment))}
                  </StudioDropdown.Button>
                </StudioDropdown.Item>
              ))}
            </StudioDropdown.List>
          </StudioDropdown>
        )}
      </div>
      <div className={classes.footer}>
        <StudioButton
          icon={<XMarkIcon />}
          onClick={collapse}
          title={t('general.close')}
          variant='secondary'
        />
      </div>
    </StudioFormGroup>
  );
}
