import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ComponentType } from 'app-shared/types/ComponentType';
import { StudioChip, StudioParagraph, StudioSelect, StudioTextfield } from '@designer/components';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { useSaveDataModelMutation } from '../../hooks/useSaveDataModelMutation';
import type { LayoutComponent } from '../../types';
import {
  answerTypes,
  getAnswerType,
  setAnswerType,
  setAnswerTypeOnField,
} from '../../utils/answerTypeUtils';
import type { AnswerType } from '../../utils/answerTypeUtils';
import { getBindingField, getComponentsByField } from '../../utils/bindingUtils';
import { getComponentText } from '../../utils/componentUtils';
import { getField, setField } from '../../utils/dataModelUtils';
import {
  fileTypeNames,
  getAllowedFileTypes,
  setAllowedFileTypes,
} from '../../utils/fileUploadUtils';
import type { FileTypeName } from '../../utils/fileUploadUtils';
import { getAllComponents, setProperty } from '../../utils/layoutUtils';
import { hasOptions } from '../../utils/newComponentUtils';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import { OptionsSetting } from './OptionsSetting';
import { SettingsSection } from './SettingsPanelFrame';
import classes from './SettingsPanel.module.css';

export type AnswerSectionProps = {
  component: LayoutComponent;
};

/** What answer the question takes. Only shown for questions. */
export function AnswerSection({ component }: AnswerSectionProps): ReactElement {
  const { t } = useTranslation();
  const { type } = component;
  return (
    <SettingsSection title={t('app_builder.settings.answer')}>
      {type === ComponentType.Input && <AnswerTypeSetting component={component} />}
      {(type === ComponentType.Input || type === ComponentType.TextArea) && (
        <NumberSetting
          component={component}
          property='maxLength'
          label={t('app_builder.settings.max_length')}
        />
      )}
      {type === ComponentType.Datepicker && <DateLimits component={component} />}
      {type === ComponentType.FileUpload && <FileUploadSettings component={component} />}
      {hasOptions(type) && <OptionsSetting component={component} />}
    </SettingsSection>
  );
}

type SettingProps = {
  component: LayoutComponent;
};

/** Sets formatting and autocomplete on the component, and the matching type in the data model. */
function AnswerTypeSetting({ component }: SettingProps): ReactElement {
  const { t } = useTranslation();
  const { org, app, dataModel, layouts, texts } = useAppBuilder();
  const { updateComponent } = usePageEditing();
  const { mutate: saveDataModel } = useSaveDataModelMutation(org, app);
  const fieldName = getBindingField(component);
  // The type is set on the field, so it also changes for other questions that save to it.
  const sharedWith = fieldName
    ? (getComponentsByField(getAllComponents(layouts)).get(fieldName) ?? []).filter(
        ({ id }) => id !== component.id,
      )
    : [];
  const answerType = getAnswerType(
    component,
    fieldName ? getField(dataModel?.schema, fieldName) : undefined,
  );
  const typeDescription = t(`app_builder.answer_type.${answerType}.description`);
  const sharedNote =
    sharedWith.length > 0
      ? t('app_builder.settings.answer_type_shared', {
          components: sharedWith
            .map((other) => `«${getComponentText(other, texts) ?? other.id}»`)
            .join(', '),
        })
      : '';

  const handleChange = (newType: AnswerType): void => {
    updateComponent(component.id, (current) => setAnswerType(current, newType));
    if (dataModel && fieldName) {
      saveDataModel({
        modelPath: dataModel.modelPath,
        schema: setField(
          dataModel.schema,
          fieldName,
          setAnswerTypeOnField(getField(dataModel.schema, fieldName), newType),
        ),
      });
    }
  };

  return (
    <StudioSelect
      label={t('app_builder.settings.answer_type')}
      description={sharedNote ? `${typeDescription} ${sharedNote}` : typeDescription}
      value={answerType}
      onChange={(event) => handleChange(event.target.value as AnswerType)}
    >
      {answerTypes.map((type) => (
        <StudioSelect.Option key={type} value={type}>
          {t(`app_builder.answer_type.${type}`)}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
}

type NumberSettingProps = SettingProps & {
  property: string;
  label: string;
  /** A required property cannot be left empty. An optional one is removed, so the default applies. */
  isRequired?: boolean;
};

/**
 * A whole number of 1 or more. A value the component cannot use, such as 0, is not saved, and the
 * field says why.
 */
function NumberSetting({
  component,
  property,
  label,
  isRequired,
}: NumberSettingProps): ReactElement {
  const { t } = useTranslation();
  const { updateComponent } = usePageEditing();
  const [error, setError] = useState<string>();
  const value = component[property];

  const handleBlur = (input: string): void => {
    const digits = input.replace(/\D/g, '');
    const newValue = digits === '' ? undefined : Number(digits);
    const isValid = newValue === undefined ? !isRequired : newValue >= 1;
    setError(isValid ? undefined : t('app_builder.settings.number_invalid'));
    if (isValid && newValue !== value) {
      updateComponent(component.id, (current) => setProperty(current, property, newValue));
    }
  };

  return (
    <StudioTextfield
      key={String(value)}
      label={label}
      inputMode='numeric'
      defaultValue={typeof value === 'number' ? String(value) : ''}
      error={error}
      onBlur={(event) => handleBlur(event.target.value)}
    />
  );
}

type DateLimit = 'none' | 'today';

const dateLimits: DateLimit[] = ['none', 'today'];

/** The earliest and latest date the user can choose, relative to the day they fill in the form. */
function DateLimits({ component }: SettingProps): ReactElement {
  const { t } = useTranslation();
  const { updateComponent } = usePageEditing();
  const renderLimit = (property: 'minDate' | 'maxDate'): ReactElement => (
    <StudioSelect
      label={t(`app_builder.settings.${property}`)}
      value={component[property] === 'today' ? 'today' : 'none'}
      onChange={(event) =>
        updateComponent(component.id, (current) =>
          setProperty(current, property, event.target.value === 'today' ? 'today' : undefined),
        )
      }
    >
      {dateLimits.map((limit) => (
        <StudioSelect.Option key={limit} value={limit}>
          {t(`app_builder.settings.date_limit.${limit}`)}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
  return (
    <>
      {renderLimit('minDate')}
      {renderLimit('maxDate')}
    </>
  );
}

function FileUploadSettings({ component }: SettingProps): ReactElement {
  const { t } = useTranslation();
  const { updateComponent } = usePageEditing();
  const allowed = getAllowedFileTypes(component);

  const toggle = (name: FileTypeName): void => {
    const names = allowed.includes(name)
      ? allowed.filter((current) => current !== name)
      : [...allowed, name];
    updateComponent(component.id, (current) => setAllowedFileTypes(current, names));
  };

  return (
    <>
      <fieldset className={classes.fieldset}>
        <legend className={classes.legend}>{t('app_builder.settings.file_types')}</legend>
        <div className={classes.chips}>
          {fileTypeNames.map((name) => (
            <StudioChip.Checkbox
              key={name}
              checked={allowed.includes(name)}
              onChange={() => toggle(name)}
            >
              {name}
            </StudioChip.Checkbox>
          ))}
        </div>
        {allowed.length === 0 && (
          <StudioParagraph data-size='sm' className={classes.summary}>
            {t('app_builder.settings.file_types.all')}
          </StudioParagraph>
        )}
      </fieldset>
      <NumberSetting
        component={component}
        property='maxFileSizeInMB'
        label={t('app_builder.settings.max_file_size')}
        isRequired
      />
      <NumberSetting
        component={component}
        property='maxNumberOfAttachments'
        label={t('app_builder.settings.max_file_count')}
        isRequired
      />
    </>
  );
}
