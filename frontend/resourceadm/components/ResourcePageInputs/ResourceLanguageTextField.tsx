import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './ResourcePageInputs.module.css';
import { Textarea, Textfield } from '@digdir/design-system-react';
import { RightTranslationBar } from '../RightTranslationBar';
import { SupportedLanguage } from 'app-shared/types/ResourceAdm';
import { getMissingInputLanguageString } from 'resourceadm/utils/resourceUtils';

/**
 * Initial value for languages with empty fields
 */
const emptyLanguages: SupportedLanguage = { nb: '', nn: '', en: '' };

type ResourceLanguageTextFieldProps = {
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
   * The error text to be shown
   */
  errorText?: string;
  /**
   * Whether the component should use textarea instead of input
   */
  useTextArea?: boolean;
};

/**
 * @component
 *    Displays an input textfield for a resource variable that has language support.
 *
 * @property {string}[label] - The label of the text field
 * @property {string}[description] - The description of the text field
 * @property {string}[translationDescription] - The description of the translation fields
 * @property {boolean}[isTranslationPanelOpen] - Whether the translation panel is open or not
 * @property {string}[value] - The value in the field
 * @property {function}[onFocus] - unction to be executed when the field is focused
 * @property {function}[onBlur] - Function to be executed on blur
 * @property {string}[errorText] - The error text to be shown
 * @property {boolean}[useTextArea] - Whether the component should use textarea instead of input
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceLanguageTextField = ({
  label,
  description,
  translationDescription,
  isTranslationPanelOpen,
  value,
  onFocus,
  onBlur,
  errorText,
  useTextArea,
}: ResourceLanguageTextFieldProps): React.ReactNode => {
  const { t } = useTranslation();

  const [translations, setTranslations] = useState<SupportedLanguage>(value ?? emptyLanguages);

  return (
    <>
      <div className={classes.divider} />
      <div className={classes.inputWrapper}>
        {useTextArea ? (
          <Textarea
            label={label}
            description={description}
            size='small'
            value={translations['nb']}
            onChange={(e) =>
              setTranslations((oldTranslations) => {
                return { ...oldTranslations, nb: e.target.value };
              })
            }
            onFocus={onFocus}
            error={errorText ? getMissingInputLanguageString(translations, errorText, t) : ''}
            onBlur={() => onBlur(translations)}
            rows={5}
          />
        ) : (
          <Textfield
            label={label}
            description={description}
            size='small'
            value={translations['nb']}
            onChange={(e) =>
              setTranslations((oldTranslations) => {
                return { ...oldTranslations, nb: e.target.value };
              })
            }
            onFocus={onFocus}
            error={errorText ? getMissingInputLanguageString(translations, errorText, t) : ''}
            onBlur={() => onBlur(translations)}
          />
        )}
      </div>
      {isTranslationPanelOpen && (
        <RightTranslationBar
          title={translationDescription}
          value={translations}
          onLanguageChange={setTranslations}
          usesTextArea={useTextArea}
          showErrors={!!errorText}
          onBlur={() => onBlur(translations)}
        />
      )}
    </>
  );
};
