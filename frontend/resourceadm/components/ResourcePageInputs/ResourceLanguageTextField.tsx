import React, { useState } from 'react';
import classes from './ResourcePageInputs.module.css';
import { StudioTextarea, StudioTextfield } from '@studio/components';
import { RightTranslationBar } from '../RightTranslationBar';
import type { ResourceFormError, SupportedLanguage } from 'app-shared/types/ResourceAdm';
import { ResourceFieldHeader } from './ResourceFieldHeader';
import { InputFieldErrorMessage } from './InputFieldErrorMessage';

/**
 * Initial value for languages with empty fields
 */
const emptyLanguages: SupportedLanguage = { nb: '', nn: '', en: '' };

type ResourceLanguageTextFieldProps = {
  /**
   * The field id, used by ErrorSummary
   */
  id: string;
  /**
   * The label of the text field
   */
  label: string;
  /**
   * The description of the text field
   */
  description: string;
  /**
   * The description of the translation fields
   */
  translationDescription: string;
  /**
   * Whether the translation panel is open or not
   */
  isTranslationPanelOpen: boolean;
  /**
   * The value in the field
   */
  value: SupportedLanguage;
  /**
   * Function to be executed when the field is focused
   * @returns void
   */
  onFocus: () => void;
  /**
   * Function to be executed on blur
   * @returns void
   */
  onBlur: (translations: SupportedLanguage) => void;
  /**
   * The error texts to be shown
   */
  errors?: ResourceFormError[];
  /**
   * Whether the component should use textarea instead of input
   */
  useTextArea?: boolean;
  /**
   * Whether this field is required or not
   */
  required?: boolean;
};

/**
 * @component
 *    Displays an input textfield for a resource variable that has language support.
 *
 * @property {string}[id] - The field id, used by ErrorSummary
 * @property {string}[label] - The label of the text field
 * @property {string}[description] - The description of the text field
 * @property {string}[translationDescription] - The description of the translation fields
 * @property {boolean}[isTranslationPanelOpen] - Whether the translation panel is open or not
 * @property {string}[value] - The value in the field
 * @property {function}[onFocus] - unction to be executed when the field is focused
 * @property {function}[onBlur] - Function to be executed on blur
 * @property {ResourceFormError[]}[errors] - The error texts to be shown
 * @property {boolean}[useTextArea] - Whether the component should use textarea instead of input
 * @property {boolean}[required] - Whether this field is required or not
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceLanguageTextField = ({
  id,
  label,
  description,
  translationDescription,
  isTranslationPanelOpen,
  value,
  onFocus,
  onBlur,
  errors,
  useTextArea,
  required,
}: ResourceLanguageTextFieldProps): React.JSX.Element => {
  const [translations, setTranslations] = useState<SupportedLanguage>(value ?? emptyLanguages);

  const getTrimmedTranslations = (): SupportedLanguage => {
    return Object.keys(translations).reduce((acc: SupportedLanguage, key) => {
      return {
        ...acc,
        [key]: translations[key].trim(),
      };
    }, {} as SupportedLanguage);
  };
  const onBlurField = () => {
    onBlur(getTrimmedTranslations());
  };

  const onChangeNbTextField = (event: React.ChangeEvent<HTMLInputElement>) => {
    onNbFieldValueChanged(event.target.value);
  };

  const onChangeNbTextArea = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onNbFieldValueChanged(event.target.value);
  };

  const onNbFieldValueChanged = (newValue: string) => {
    setTranslations((oldTranslations) => {
      return { ...oldTranslations, nb: newValue };
    });
  };

  const mainFieldError = errors
    .filter((error) => error.index === 'nb')
    .map((error, index) => <InputFieldErrorMessage key={index} message={error.error} />);

  return (
    <>
      <div className={classes.inputWrapper}>
        {useTextArea ? (
          <StudioTextarea
            id={id}
            label={<ResourceFieldHeader label={label} required={required} />}
            description={description}
            size='sm'
            value={translations['nb']}
            onChange={onChangeNbTextArea}
            onFocus={onFocus}
            error={mainFieldError.length > 0 ? mainFieldError : undefined}
            onBlur={onBlurField}
            rows={5}
            required={required}
          />
        ) : (
          <StudioTextfield
            id={id}
            label={<ResourceFieldHeader label={label} required={required} />}
            description={description}
            value={translations['nb']}
            onChange={onChangeNbTextField}
            onFocus={onFocus}
            error={mainFieldError.length > 0 ? mainFieldError : undefined}
            onBlur={onBlurField}
            required={required}
          />
        )}
      </div>
      {isTranslationPanelOpen && (
        <RightTranslationBar
          title={translationDescription}
          value={translations}
          onLanguageChange={setTranslations}
          usesTextArea={useTextArea}
          errors={errors}
          onBlur={onBlurField}
          required={required}
        />
      )}
    </>
  );
};
