import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioButton,
  StudioFieldset,
  StudioHeading,
  StudioParagraph,
  StudioSwitch,
  StudioTextfield,
} from '@designer/components';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import { EDITOR_LANGUAGE } from '../../constants';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import {
  useAddLanguageMutation,
  useDeleteLanguageMutation,
} from '../../hooks/useLanguageMutations';
import { useLanguagesQuery } from '../../hooks/useLanguagesQuery';
import type { TextsById } from '../../types';
import { getPageTitle } from '../../utils/pageUtils';
import { getTextsById } from '../../utils/textUtils';
import { countMissing, getTextRows } from '../../utils/textRowUtils';
import type { TextRow } from '../../utils/textRowUtils';
import classes from './TextsView.module.css';

/** The languages the user can add besides the main language. */
const otherLanguages = ['nn', 'en'] as const;

type OtherLanguage = (typeof otherLanguages)[number];

/**
 * The app's texts side by side, one column per language. Bokmål is the main language and is edited
 * in place on the canvas too; the other languages are switched on here.
 */
export function TextsView(): ReactElement {
  const { t } = useTranslation();
  const { org, app, layouts, contentPageNames, summaryPageName, texts } = useAppBuilder();
  const {
    data: languages = [],
    isPending: languagesPending,
    isError: languagesError,
  } = useLanguagesQuery(org, app);
  // Adding a language writes its whole text file, so the switches wait until the languages are known.
  const canSwitchLanguages = !languagesPending && !languagesError;
  const { data: textResources } = useTextResourcesQuery(org, app);
  const { mutate: addLanguage } = useAddLanguageMutation(org, app);
  const { mutate: deleteLanguage } = useDeleteLanguageMutation(org, app);
  const [languageToDelete, setLanguageToDelete] = useState<OtherLanguage>();

  const pageNames = summaryPageName ? [...contentPageNames, summaryPageName] : contentPageNames;
  const rows = getTextRows(layouts, pageNames);
  const activeLanguages = otherLanguages.filter((language) => languages.includes(language));
  const textsByLanguage = Object.fromEntries(
    activeLanguages.map((language) => [language, getTextsById(textResources, language)]),
  );
  const missing = activeLanguages
    .map((language) => ({ language, count: countMissing(rows, texts, textsByLanguage[language]) }))
    .filter(({ count }) => count > 0);

  const handleSwitch = (language: OtherLanguage, isOn: boolean): void => {
    if (!canSwitchLanguages) return;
    if (isOn) addLanguage({ language, mainTexts: texts });
    else setLanguageToDelete(language);
  };

  return (
    <div className={classes.textsView}>
      <StudioHeading level={2} data-size='sm'>
        {t('app_builder.texts.title')}
      </StudioHeading>
      <StudioParagraph>{t('app_builder.texts.introduction')}</StudioParagraph>
      <StudioFieldset legend={t('app_builder.texts.languages')} data-size='sm'>
        {otherLanguages.map((language) => (
          <StudioSwitch
            key={language}
            label={t(`language.${language}`)}
            checked={activeLanguages.includes(language)}
            disabled={!canSwitchLanguages}
            onChange={(event) => handleSwitch(language, event.target.checked)}
          />
        ))}
      </StudioFieldset>
      {languagesError && (
        <StudioAlert data-color='danger'>{t('app_builder.texts.languages_load_error')}</StudioAlert>
      )}
      {languageToDelete && (
        <StudioAlert data-color='warning'>
          <StudioParagraph>
            {t('app_builder.texts.delete_language', {
              language: t(`language.${languageToDelete}`),
            })}
          </StudioParagraph>
          <div className={classes.buttons}>
            <StudioButton
              data-color='danger'
              data-size='sm'
              onClick={() => {
                deleteLanguage(languageToDelete);
                setLanguageToDelete(undefined);
              }}
            >
              {t('app_builder.texts.delete_language_confirm', {
                language: t(`language.${languageToDelete}`),
              })}
            </StudioButton>
            <StudioButton
              variant='tertiary'
              data-size='sm'
              onClick={() => setLanguageToDelete(undefined)}
            >
              {t('general.cancel')}
            </StudioButton>
          </div>
        </StudioAlert>
      )}
      {missing.length > 0 && (
        <StudioAlert data-color='warning'>
          {missing
            .map(({ language, count }) =>
              t('app_builder.texts.missing', {
                count,
                language: t(`language.${language}`).toLowerCase(),
              }),
            )
            .join(' ')}
        </StudioAlert>
      )}
      <TextTable rows={rows} languages={activeLanguages} textsByLanguage={textsByLanguage} />
    </div>
  );
}

type TextTableProps = {
  rows: TextRow[];
  languages: OtherLanguage[];
  textsByLanguage: Record<string, TextsById>;
};

function TextTable({ rows, languages, textsByLanguage }: TextTableProps): ReactElement {
  const { t } = useTranslation();
  const { org, app, texts } = useAppBuilder();
  const { mutate: upsertText } = useUpsertTextResourceMutation(org, app);
  const columns = [EDITOR_LANGUAGE, ...languages];
  const textsIn = (language: string): TextsById =>
    language === EDITOR_LANGUAGE ? texts : textsByLanguage[language];

  const placementOf = (row: TextRow): string => {
    const parts = [getPageTitle(row.pageName, texts)];
    if (row.component) parts.push(t(`app_builder.component_type.${row.component.type}`));
    parts.push(
      t(`app_builder.texts.property.${row.property ?? 'page_name'}`, {
        defaultValue: row.property,
      }),
    );
    return parts.join(' · ');
  };

  return (
    <div
      className={classes.table}
      role='table'
      style={{
        gridTemplateColumns: `minmax(160px, 1fr) repeat(${columns.length}, minmax(200px, 2fr))`,
      }}
    >
      <div role='row' className={classes.row}>
        <span role='columnheader' className={classes.header}>
          {t('app_builder.texts.placement')}
        </span>
        {columns.map((language) => (
          <span key={language} role='columnheader' className={classes.header}>
            {t(`language.${language}`)}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.textKey} role='row' className={classes.row}>
          <span role='cell' className={classes.placement}>
            {placementOf(row)}
          </span>
          {columns.map((language) => {
            const value = textsIn(language)[row.textKey] ?? '';
            return (
              <span key={language} role='cell'>
                <StudioTextfield
                  key={value}
                  data-size='sm'
                  aria-label={`${placementOf(row)}, ${t(`language.${language}`)}`}
                  defaultValue={value}
                  onBlur={(event) => {
                    if (event.target.value !== value) {
                      upsertText({
                        textId: row.textKey,
                        language,
                        translation: event.target.value,
                      });
                    }
                  }}
                />
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
