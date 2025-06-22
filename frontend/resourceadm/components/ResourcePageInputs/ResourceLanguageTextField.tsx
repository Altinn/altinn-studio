import React, { useEffect, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import classes from './ResourcePageInputs.module.css';
import { StudioTabs } from '@studio/components-legacy';
import { StudioTextfield } from '@studio/components';
import { XMarkOctagonFillIcon } from '@studio/icons';
import type {
  ResourceFormError,
  SupportedLanguage,
  ValidLanguage,
} from 'app-shared/types/ResourceAdm';
import { ResourceFieldHeader } from './ResourceFieldHeader';
import { useTranslation } from 'react-i18next';

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
   * The value in the field
   */
  value: SupportedLanguage;
  /**
   * Function to be executed on blur
   * @returns void
   */
  onBlur: (translations: SupportedLanguage) => void;
  /**
   * The error texts to be shown
   */
  errors: ResourceFormError[];
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
 * @property {string}[value] - The value in the field
 * @property {function}[onBlur] - Function to be executed on blur
 * @property {ResourceFormError[]}[errors] - The error texts to be shown
 * @property {boolean}[useTextArea] - Whether the component should use textarea instead of input
 * @property {boolean}[required] - Whether this field is required or not
 *
 * @returns {ReactElement} - The rendered component
 */
export const ResourceLanguageTextField = ({
  id,
  label,
  description,
  value,
  onBlur,
  errors,
  useTextArea,
  required,
}: ResourceLanguageTextFieldProps): ReactElement => {
  const [selectedLanguage, setSelectedLanguage] = useState<ValidLanguage>('nb');
  const [translations, setTranslations] = useState<SupportedLanguage>(value ?? emptyLanguages);

  useEffect(() => {
    if (JSON.stringify(value) !== JSON.stringify(translations)) {
      const trimmedTranslations = Object.keys(translations).reduce(
        (acc: SupportedLanguage, key) => {
          return {
            ...acc,
            [key]: translations[key].trim(),
          };
        },
        {} as SupportedLanguage,
      );
      onBlur(trimmedTranslations);
    }
  }, [translations, value, onBlur]);

  const onFieldValueChanged = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    setTranslations((oldTranslations) => {
      return { ...oldTranslations, [selectedLanguage]: newValue };
    });
  };

  const mainFieldError = errors.map((error, index) => (
    <span key={index} className={classes.translationFieldError}>
      {error.error}
    </span>
  ));

  return (
    <div className={classes.inputWrapper}>
      <LanguageInputField
        id={id}
        required={required}
        label={<ResourceFieldHeader label={label} required={required} />}
        description={
          <div className={classes.translationFieldDescription}>
            {description}
            <LanguageTabs
              label={label}
              errors={errors}
              selectedLanguage={selectedLanguage}
              onChangeSelectedLanguage={setSelectedLanguage}
            />
          </div>
        }
        value={translations[selectedLanguage]}
        onChange={onFieldValueChanged}
        isTextArea={useTextArea}
        error={mainFieldError.length > 0 ? mainFieldError : undefined}
      />
    </div>
  );
};

type LanguageInputFieldProps = {
  id: string;
  required?: boolean;
  isTextArea?: boolean;
  label: ReactElement;
  description: ReactElement;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error: ReactElement[];
};
const LanguageInputField = ({ isTextArea, ...rest }: LanguageInputFieldProps): ReactElement => {
  if (isTextArea) {
    return <StudioTextfield multiline rows={5} {...rest} />;
  }
  return <StudioTextfield {...rest} />;
};

interface LanguageTabsProps {
  label: string;
  errors?: ResourceFormError[];
  selectedLanguage: ValidLanguage;
  onChangeSelectedLanguage: (newSelectedLanguage: ValidLanguage) => void;
}
const LanguageTabs = ({
  label,
  errors,
  selectedLanguage,
  onChangeSelectedLanguage,
}: LanguageTabsProps): ReactElement => {
  const { t } = useTranslation();

  const onLanguageChanged = (newValue: string): void => {
    onChangeSelectedLanguage(newValue as ValidLanguage);
  };

  return (
    <StudioTabs defaultValue='nb' size='sm' value={selectedLanguage} onChange={onLanguageChanged}>
      <StudioTabs.List>
        {['nb', 'nn', 'en'].map((language) => {
          const languageText = t(`language.${language}`);
          return (
            <StudioTabs.Tab key={language} value={language} aria-label={`${languageText} ${label}`}>
              {errors.some((error) => error.index === language) && (
                <XMarkOctagonFillIcon className={classes.translationFieldTabError} />
              )}
              {languageText}
            </StudioTabs.Tab>
          );
        })}
      </StudioTabs.List>
    </StudioTabs>
  );
};
