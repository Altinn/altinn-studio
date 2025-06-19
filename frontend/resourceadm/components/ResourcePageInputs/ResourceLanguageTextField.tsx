import React, { useState } from 'react';
import classes from './ResourcePageInputs.module.css';
import { StudioTabs } from '@studio/components-legacy';
import { StudioTextfield } from '@studio/components';
import { XMarkOctagonFillIcon } from '@studio/icons';
import type { ResourceFormError, SupportedLanguage } from 'app-shared/types/ResourceAdm';
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
 * @property {string}[value] - The value in the field
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
  value,
  onBlur,
  errors,
  useTextArea,
  required,
}: ResourceLanguageTextFieldProps): React.JSX.Element => {
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('nb');
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

  const onFieldValueChanged = (language: string, newValue: string) => {
    setTranslations((oldTranslations) => {
      return { ...oldTranslations, [language]: newValue };
    });
  };

  const mainFieldError = errors.map((error, index) => (
    <span key={index} className={classes.translationFieldError}>
      {error.error}
    </span>
  ));

  return (
    <div className={classes.inputWrapper}>
      {/*@ts-expect-error typescript will complain that aria-labelledby is missing, seems to be caused "multiline" prop since can be both true and false*/}
      <StudioTextfield
        id={id}
        required={required}
        label={<ResourceFieldHeader label={label} required={required} />}
        description={
          <>
            {description}
            <StudioTabs
              defaultValue='nb'
              size='sm'
              value={selectedLanguage}
              onChange={setSelectedLanguage}
            >
              <StudioTabs.List>
                <StudioTabs.Tab
                  value='nb'
                  aria-label={`${t('resourceadm.about_resource_translation_nb')} ${label}`}
                >
                  {errors.some((error) => error.index == 'nb') && <TranslationTabError />}
                  {t('resourceadm.about_resource_translation_nb')}
                </StudioTabs.Tab>
                <StudioTabs.Tab
                  value='nn'
                  aria-label={`${t('resourceadm.about_resource_translation_nn')} ${label}`}
                >
                  {errors.some((error) => error.index == 'nn') && <TranslationTabError />}
                  {t('resourceadm.about_resource_translation_nn')}
                </StudioTabs.Tab>
                <StudioTabs.Tab
                  value='en'
                  aria-label={`${t('resourceadm.about_resource_translation_en')} ${label}`}
                >
                  {errors.some((error) => error.index == 'en') && <TranslationTabError />}
                  {t('resourceadm.about_resource_translation_en')}
                </StudioTabs.Tab>
              </StudioTabs.List>
            </StudioTabs>
          </>
        }
        value={translations[selectedLanguage]}
        onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          onFieldValueChanged(selectedLanguage, event.target.value)
        }
        multiline={useTextArea}
        error={mainFieldError.length > 0 ? mainFieldError : undefined}
        onBlur={onBlurField}
        rows={5}
      />
    </div>
  );
};

const TranslationTabError = () => (
  <XMarkOctagonFillIcon className={classes.translationFieldTabError} />
);
