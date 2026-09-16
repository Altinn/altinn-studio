import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioButton,
  StudioDeleteButton,
  StudioDisplayTile,
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
  getUnknownEnvironmentNames,
  resolveEnvironmentEntries,
  withEnvironmentValue,
  withoutEntry,
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
   * Whether the value control can itself express the empty value, which is how a row is emptied: a
   * textfield is cleared, a multi-select has its last option removed. Defaults to true.
   *
   * A radio group cannot - an answer once chosen cannot be unchosen - so a field built on one says
   * so here and the environment-independent row gets a button that removes the entry instead.
   * Without it the first answer a user tries would be in the file for good. Override rows are
   * removable either way.
   */
  canClearValue?: boolean;
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
  canClearValue = true,
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

  const handleRemove = (scope: EnvironmentScope): void => {
    if (scope !== globalScope) removeDraft(scope);
    if (hasEntry(scope)) onChange(withoutEnvironmentValue(entries, scope));
  };

  const overrideScopes = altinnEnvironments.filter(
    (environment) =>
      hasEntry(environment) || drafts.some((draft) => draft.environment === environment),
  );
  const availableEnvironments = altinnEnvironments.filter(
    (environment) => !overrideScopes.includes(environment),
  );

  // The count follows the names, so the sentence agrees with the list the user is shown.
  const unknownEnvironments = getUnknownEnvironmentNames(resolved);

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

  /**
   * An override row always offers removal: it is how an override is taken away, and how one added
   * by mistake is abandoned before it ever reaches the file. The environment-independent row offers
   * it only when the control cannot be emptied by hand, because there the button is the only way
   * back out of a value.
   */
  const renderRemoveButton = (scope: EnvironmentScope): ReactElement | null => {
    if (scope === globalScope) {
      if (canClearValue || !hasEntry(globalScope)) return null;
      return (
        <StudioDeleteButton
          onDelete={() => handleRemove(globalScope)}
          title={t('process_editor.configuration_panel.environment_config.remove_global_value')}
          variant='tertiary'
        />
      );
    }
    return (
      <StudioDeleteButton
        onDelete={() => handleRemove(scope)}
        title={t('general.delete_item', { item: t(getEnvironmentScopeTextKey(scope)) })}
        variant='tertiary'
      />
    );
  };

  const renderRow = (scope: EnvironmentScope): ReactElement => (
    <div className={classes.row} key={scope}>
      <div className={classes.control}>
        {renderValueControl({
          label: t(getEnvironmentScopeTextKey(scope)),
          value: getValue(scope),
          onChange: (value: TValue) => handleValueChange(scope, value),
        })}
      </div>
      {renderRemoveButton(scope)}
    </div>
  );

  /**
   * An entry whose `env` the runtime resolves to `Unknown`, shown rather than left out.
   *
   * It is the one thing in the file the rows used to pass over in silence, and silence is the one
   * thing this control cannot afford: the panel would be claiming the field held nothing while the
   * file held a value the developer could neither see nor reach.
   *
   * The value is read-only, and removing it is all the editing offered. Studio cannot say which
   * environment the entry is for, so it has no row to move it to and no reading of it to write
   * back - and an entry left alone is an entry kept exactly as the file spells it. A developer who
   * meant one of the three environments removes this one and adds the override.
   *
   * One row per entry, not per spelling: two entries can spell the same unrecognized environment,
   * and the file really does have two lines.
   */
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
        {resolved.unknownEntries.map(renderUnknownEntryRow)}
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
