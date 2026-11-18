import { useId, useState } from 'react';
import type { FormEvent, KeyboardEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioHeading } from '@designer/components';
import { isValidFieldName, suggestFieldName } from '../../utils/fieldNameUtils';
import { savesToDataModel } from '../../utils/newComponentUtils';
import type { QuestionComponentType } from '../../utils/newComponentUtils';
import classes from './NewComponentForm.module.css';

export type NewComponentValues = {
  label: string;
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
 * Asks for what a new data component needs: a label and the data model field it saves to. The field
 * name follows the label until the user changes it, so most users only type the label.
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
  const [required, setRequired] = useState<boolean>(false);
  const [editedFieldName, setEditedFieldName] = useState<string>();
  const [isEditingFieldName, setIsEditingFieldName] = useState<boolean>(false);

  const suggestedFieldName = suggestFieldName(label, takenFieldNames, type.toLowerCase());
  const fieldName = editedFieldName ?? suggestedFieldName;
  const fieldNameError = getFieldNameError(fieldName, takenFieldNames);
  const needsFieldName = hasDataModel && asksForField;
  const canAdd = label.trim() !== '' && (!needsFieldName || !fieldNameError) && !isSaving;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!canAdd) return;
    onAdd({ label: label.trim(), fieldName: needsFieldName ? fieldName : undefined, required });
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
        <label className='ds-label' htmlFor={`${id}-label`}>
          {t('app_builder.new_component.label')}
        </label>
        <input
          id={`${id}-label`}
          className='ds-input'
          value={label}
          // The form opens because the user asked for it, so the label field takes focus.
          autoFocus
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>
      {needsFieldName && !isEditingFieldName && (
        <div className={classes.savedAs}>
          <span>{t('app_builder.new_component.saved_as', { fieldName })}</span>
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
      <label className={classes.checkbox}>
        <input
          type='checkbox'
          className='ds-input'
          checked={required}
          onChange={(event) => setRequired(event.target.checked)}
        />
        {t('app_builder.new_component.required')}
      </label>
      <div className={classes.buttons}>
        <StudioButton variant='tertiary' data-size='sm' onClick={onCancel}>
          {t('general.cancel')}
        </StudioButton>
        <StudioButton type='submit' variant='primary' data-size='sm' disabled={!canAdd}>
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
