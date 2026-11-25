import { useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { FormEvent, KeyboardEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { ComponentType } from 'app-shared/types/ComponentType';
import { OptionalIndicator, RequiredIndicator } from '@app/form-component';
import { StudioButton, StudioHeading, StudioToggleGroup } from '@designer/components';
import { PlusIcon, XMarkIcon } from '@designer/icons';
import { isValidFieldName, suggestFieldName } from '../../utils/fieldNameUtils';
import { hasOptions, savesToDataModel } from '../../utils/newComponentUtils';
import type { QuestionComponentType } from '../../utils/newComponentUtils';
import classes from './NewComponentForm.module.css';

export type NewComponentValues = {
  label: string;
  /** Left out when the user wrote none. */
  description?: string;
  /**
   * The options the user wrote, without empty ones. Undefined for a question without options, and for
   * radio buttons that ask yes or no.
   */
  options?: string[];
  /** Undefined when the layout set has no data model. */
  fieldName?: string;
  required: boolean;
};

export type NewComponentFormProps = {
  type: QuestionComponentType;
  hasDataModel: boolean;
  takenFieldNames: string[];
  isSaving: boolean;
  onAdd: (values: NewComponentValues) => void;
  onCancel: () => void;
};

/**
 * Asks for what a new data component needs: a label and the data model field it saves to, and for
 * what most questions get next: a description and, for a question with options, the options. The
 * field name follows the label until the user changes it, so most users only type the label.
 */
export function NewComponentForm({
  type,
  hasDataModel,
  takenFieldNames,
  isSaving,
  onAdd,
  onCancel,
}: NewComponentFormProps): ReactElement {
  const { t } = useTranslation();
  const id = useId();
  // A file upload saves attachments, so it needs no field.
  const asksForField = savesToDataModel(type);
  const [label, setLabel] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const asksForOptions = hasOptions(type);
  // Radio buttons ask yes or no unless the user chooses to write the options.
  const [isYesNo, setIsYesNo] = useState<boolean>(type === ComponentType.RadioButtons);
  const [required, setRequired] = useState<boolean>(false);
  const [editedFieldName, setEditedFieldName] = useState<string>();
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isEditingFieldName, setIsEditingFieldName] = useState<boolean>(false);

  const suggestedFieldName = suggestFieldName(label, takenFieldNames, type.toLowerCase());
  const fieldName = editedFieldName ?? suggestedFieldName;
  const fieldNameError = getFieldNameError(fieldName, takenFieldNames);
  const needsFieldName = hasDataModel && asksForField;
  const hasLabel = label.trim() !== '';
  const [showsLabelError, setShowsLabelError] = useState<boolean>(false);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (isSaving) return;
    if (!hasLabel) {
      setShowsLabelError(true);
      labelInputRef.current?.focus();
      return;
    }
    // The field name follows the label, so its error shows only once the user sees the name.
    if (needsFieldName && fieldNameError) {
      setIsEditingFieldName(true);
      return;
    }
    onAdd({
      label: label.trim(),
      description: description.trim() || undefined,
      options:
        asksForOptions && !isYesNo ? options.map((o) => o.trim()).filter(Boolean) : undefined,
      fieldName: needsFieldName ? fieldName : undefined,
      required,
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>): void => {
    if (event.key === 'Escape') onCancel();
  };

  const translatedError = fieldNameError && t(fieldNameError, { fieldName });

  return (
    <form
      className={classes.newComponentForm}
      data-size='sm'
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <StudioHeading level={2} data-size='xs'>
        {t('app_builder.new_component.title', {
          componentType: t(`app_builder.component_type.${type}`).toLowerCase(),
        })}
      </StudioHeading>
      <div className={classes.field}>
        <label className={cn('ds-label', classes.labelWithTag)} htmlFor={`${id}-label`}>
          {t('app_builder.new_component.label')}
          <RequiredIndicator required />
        </label>
        <input
          ref={labelInputRef}
          id={`${id}-label`}
          className='ds-input'
          value={label}
          aria-required
          aria-invalid={showsLabelError && !hasLabel}
          aria-describedby={showsLabelError && !hasLabel ? `${id}-label-error` : undefined}
          // The form opens because the user asked for it, so the label field takes focus.
          autoFocus
          onChange={(event) => setLabel(event.target.value)}
        />
        {showsLabelError && !hasLabel && (
          <span id={`${id}-label-error`} className={classes.error}>
            {t('app_builder.new_component.label_missing')}
          </span>
        )}
      </div>
      <div className={classes.field}>
        <label className={cn('ds-label', classes.labelWithTag)} htmlFor={`${id}-description`}>
          {t('app_builder.new_component.description')}
          {/* Marked as the app marks optional fields, so the box reads like the page around it. */}
          <OptionalIndicator required={false} />
        </label>
        <textarea
          id={`${id}-description`}
          className='ds-input'
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      {asksForOptions && (
        <OptionsField
          canAskYesOrNo={type === ComponentType.RadioButtons}
          isYesNo={isYesNo}
          onYesNoChange={setIsYesNo}
          options={options}
          onOptionsChange={setOptions}
        />
      )}
      <label className={classes.checkbox}>
        <input
          type='checkbox'
          className='ds-input'
          checked={required}
          onChange={(event) => setRequired(event.target.checked)}
        />
        {t('app_builder.new_component.required')}
      </label>
      {/* The line is there from the start, so it does not jump in when the user starts typing. */}
      {needsFieldName && !isEditingFieldName && (
        <div className={classes.savedAs}>
          <span className={classes.savedAsText}>
            {hasLabel
              ? t('app_builder.new_component.saved_as', { fieldName })
              : t('app_builder.new_component.saved_as_pending')}
          </span>
          <StudioButton
            variant='tertiary'
            data-size='sm'
            onClick={() => setIsEditingFieldName(true)}
          >
            {t('app_builder.new_component.change_field_name')}
          </StudioButton>
        </div>
      )}
      {needsFieldName && isEditingFieldName && (
        <div className={classes.field}>
          <label className='ds-label' htmlFor={`${id}-field-name`}>
            {t('app_builder.new_component.field_name')}
          </label>
          <input
            id={`${id}-field-name`}
            className='ds-input'
            value={fieldName}
            aria-invalid={Boolean(translatedError)}
            aria-describedby={translatedError ? `${id}-field-name-error` : undefined}
            onChange={(event) => setEditedFieldName(event.target.value)}
          />
          {translatedError && (
            <span id={`${id}-field-name-error`} className={classes.error}>
              {translatedError}
            </span>
          )}
        </div>
      )}
      {!hasDataModel && asksForField && (
        <span className={classes.note}>{t('app_builder.new_component.no_data_model')}</span>
      )}
      <div className={classes.buttons}>
        <StudioButton variant='tertiary' data-size='sm' onClick={onCancel}>
          {t('general.cancel')}
        </StudioButton>
        <StudioButton type='submit' variant='primary' data-size='sm' disabled={isSaving}>
          {t('app_builder.new_component.add')}
        </StudioButton>
      </div>
    </form>
  );
}

function getFieldNameError(fieldName: string, takenFieldNames: string[]): string | undefined {
  if (!isValidFieldName(fieldName)) return 'app_builder.new_component.field_name_invalid';
  if (takenFieldNames.includes(fieldName)) return 'app_builder.new_component.field_name_taken';
  return undefined;
}

type OptionsFieldProps = {
  canAskYesOrNo: boolean;
  isYesNo: boolean;
  onYesNoChange: (isYesNo: boolean) => void;
  options: string[];
  onOptionsChange: (options: string[]) => void;
};

/**
 * The options of a new question, one field each. Enter in the last field adds the next one, so a list
 * is typed without the mouse; Enter in an empty last field adds the question.
 */
function OptionsField({
  canAskYesOrNo,
  isYesNo,
  onYesNoChange,
  options,
  onOptionsChange,
}: OptionsFieldProps): ReactElement {
  const { t } = useTranslation();
  const id = useId();
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const change = (index: number, value: string): void =>
    onOptionsChange(options.map((option, i) => (i === index ? value : option)));

  const add = (): void => {
    // The new field is rendered before the handler returns, so it can take focus right away.
    flushSync(() => onOptionsChange([...options, '']));
    inputsRef.current[options.length]?.focus();
  };

  const remove = (index: number): void => {
    onOptionsChange(options.filter((_, i) => i !== index));
    inputsRef.current[Math.max(0, index - 1)]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number): void => {
    if (event.key !== 'Enter') return;
    const isLast = index === options.length - 1;
    if (isLast && options[index].trim() === '') return; // Submits the form.
    event.preventDefault();
    if (isLast) add();
    else inputsRef.current[index + 1]?.focus();
  };

  return (
    <div className={classes.field} role='group' aria-labelledby={`${id}-title`}>
      <span id={`${id}-title`} className='ds-label'>
        {t('app_builder.new_component.options')}
      </span>
      {canAskYesOrNo && (
        <StudioToggleGroup
          data-size='sm'
          value={isYesNo ? 'yesNo' : 'own'}
          onChange={(value) => onYesNoChange(value === 'yesNo')}
        >
          <StudioToggleGroup.Item value='yesNo'>
            {t('app_builder.new_component.options_yes_no')}
          </StudioToggleGroup.Item>
          <StudioToggleGroup.Item value='own'>
            {t('app_builder.new_component.options_own')}
          </StudioToggleGroup.Item>
        </StudioToggleGroup>
      )}
      {!isYesNo && (
        <>
          <ol className={classes.options}>
            {options.map((option, index) => {
              const name = t('app_builder.new_component.option', { number: index + 1 });
              return (
                <li key={index} className={classes.option}>
                  <input
                    ref={(input) => {
                      inputsRef.current[index] = input;
                    }}
                    className='ds-input'
                    // The first field takes focus when the user chooses to write the options of a
                    // radio button question. A checkbox list or dropdown leaves focus on the label.
                    autoFocus={index === 0 && canAskYesOrNo}
                    aria-label={name}
                    placeholder={name}
                    value={option}
                    onChange={(event) => change(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                  />
                  {options.length > 1 && (
                    <StudioButton
                      variant='tertiary'
                      data-size='sm'
                      icon={<XMarkIcon />}
                      aria-label={t('app_builder.new_component.remove_option', {
                        number: index + 1,
                      })}
                      onClick={() => remove(index)}
                    />
                  )}
                </li>
              );
            })}
          </ol>
          <div className={classes.addOption}>
            <StudioButton variant='tertiary' data-size='sm' icon={<PlusIcon />} onClick={add}>
              {t('app_builder.add_option')}
            </StudioButton>
            <span className={classes.note}>{t('app_builder.new_component.options_hint')}</span>
          </div>
        </>
      )}
    </div>
  );
}
