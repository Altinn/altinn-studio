import React, { forwardRef, useRef, useState } from 'react';
import type { ChangeEvent, ReactElement, ReactNode, Ref } from 'react';
import classes from './ResourcePageInputs.module.css';
import { StudioButton, StudioTextfield, StudioTabs } from '@studio/components';
import { BulletListIcon, LinkIcon, XMarkOctagonFillIcon } from '@studio/icons';
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
   * Function to be executed on change
   * @returns void
   */
  onChange?: (translations: SupportedLanguage) => void;
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
  /**
   * Whether this field has markdown toolbar
   */
  hasMarkdownToolbar?: boolean;
  /**
   * Function to set the preview language
   */
  onSetLanguage?: (validLanguage: ValidLanguage) => void;
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
 * @property {function}[onChange] - Function to be executed on change
 * @property {ResourceFormError[]}[errors] - The error texts to be shown
 * @property {boolean}[useTextArea] - Whether the component should use textarea instead of input
 * @property {boolean}[required] - Whether this field is required or not
 * @property {boolean}[hasMarkdownToolbar] - Whether this field has markdown toolbar
 *
 * @returns {ReactElement} - The rendered component
 */
export const ResourceLanguageTextField = ({
  id,
  label,
  description,
  value,
  onBlur,
  onChange,
  errors,
  useTextArea,
  required,
  hasMarkdownToolbar,
  onSetLanguage,
}: ResourceLanguageTextFieldProps): ReactElement => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>();
  const [selectedLanguage, setSelectedLanguage] = useState<ValidLanguage>('nb');
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

  const onFieldValueChanged = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    onChangeText(newValue);
  };

  const onChangeText = (newValue: string): void => {
    if (onChange) {
      onChange({ ...translations, [selectedLanguage]: newValue });
    }
    setTranslations((oldTranslations) => {
      return { ...oldTranslations, [selectedLanguage]: newValue };
    });
  };

  const onAddMetadata = (): void => {
    onAddMarkdown('{metadata}', 'metadata');
  };

  const onAddMarkdownLink = (): void => {
    onAddMarkdown('[Link](https://altinn.no)', 'Link');
  };

  const onAddMarkdownList = (): void => {
    onAddMarkdown('\n- Item1\n- Item2\n- Item3\n');
  };

  const onChangeLanguage = (newSelectedLanguage: ValidLanguage): void => {
    setSelectedLanguage(newSelectedLanguage);
    if (onSetLanguage) {
      onSetLanguage(newSelectedLanguage);
    }
  };

  const onAddMarkdown = (text: string, selectionText?: string): void => {
    if (inputRef.current) {
      const caretIndex = inputRef.current.selectionEnd;
      const fieldValue = inputRef.current.value;
      const newValue = fieldValue.slice(0, caretIndex) + text + fieldValue.slice(caretIndex);

      onChangeText(newValue);
      inputRef.current.focus();
      requestAnimationFrame(() => {
        let startIndex = caretIndex;
        let endIndex = caretIndex + text.length;
        if (selectionText) {
          startIndex = caretIndex + text.indexOf(selectionText);
          endIndex = caretIndex + text.indexOf(selectionText) + selectionText.length;
        }
        if (inputRef.current) {
          inputRef.current.setSelectionRange(startIndex, endIndex);
        }
      });
    }
  };

  const mainFieldError = errors.map((error, index) => (
    <span key={index} className={classes.translationFieldError}>
      {error.error}
    </span>
  ));

  return (
    <div className={classes.inputWrapper}>
      <ForwardedLanguageInputField
        id={id}
        ref={inputRef}
        required={required}
        label={<ResourceFieldHeader label={label} required={required} />}
        description={
          <div className={classes.translationFieldDescription}>
            {description}
            <div className={classes.tabControlContainer}>
              <LanguageTabs
                label={label}
                errors={errors}
                selectedLanguage={selectedLanguage}
                onChangeSelectedLanguage={onChangeLanguage}
              />
              {hasMarkdownToolbar && (
                <div className={classes.markdownToolbar}>
                  <MarkdownToolbarButton
                    icon={<BulletListIcon />}
                    text={t('resourceadm.about_resource_consent_add_list')}
                    onClick={onAddMarkdownList}
                  />
                  <MarkdownToolbarButton
                    icon={<LinkIcon />}
                    text={t('resourceadm.about_resource_consent_add_link')}
                    onClick={onAddMarkdownLink}
                  />
                  <MarkdownToolbarButton
                    icon={'{ }'}
                    text={t('resourceadm.about_resource_consent_add_metadata')}
                    onClick={onAddMetadata}
                  />
                </div>
              )}
            </div>
          </div>
        }
        value={translations[selectedLanguage]}
        onChange={onFieldValueChanged}
        isTextArea={useTextArea}
        error={mainFieldError.length > 0 ? mainFieldError : undefined}
        onBlur={onBlurField}
      />
    </div>
  );
};

type MarkdownToolbarButtonProps = {
  text: string;
  icon: ReactNode;
  onClick: () => void;
};
const MarkdownToolbarButton = ({ text, icon, onClick }: MarkdownToolbarButtonProps) => {
  return (
    <StudioButton variant='tertiary' icon={icon} title={text} aria-label={text} onClick={onClick} />
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
  onBlur: () => void;
};
function LanguageInputField(
  { isTextArea, ...rest }: LanguageInputFieldProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  if (isTextArea) {
    return <StudioTextfield ref={ref} multiline rows={5} {...rest} />;
  }
  return <StudioTextfield ref={ref} {...rest} />;
}
const ForwardedLanguageInputField = forwardRef(LanguageInputField);

type LanguageTabsProps = {
  label: string;
  errors?: ResourceFormError[];
  selectedLanguage: ValidLanguage;
  onChangeSelectedLanguage: (newSelectedLanguage: ValidLanguage) => void;
};
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
    <StudioTabs
      defaultValue='nb'
      data-size='sm'
      value={selectedLanguage}
      onChange={onLanguageChanged}
    >
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
