/* eslint-disable-next-line */
// @ts-nocheck

import React from 'react';

import type { ILanguageEditor } from './utils';
import { getAllTranslationKeys, transformLanguages } from './utils';

import noFlag from './no.png';
import ukFlag from './uk.png';

export interface ILanguageEditorProps extends ILanguageEditor {
  onTranslationChange: ({
    translationKey,
    langCode,
    newValue,
  }: {
    translationKey: string;
    langCode: string;
    newValue: string;
  }) => void;
  onKeyChange: ({ id, newValue }: { id: string; newValue: string }) => void;
}

export const LanguageEditor = ({
  languages,
  onKeyChange,
  onTranslationChange,
}: ILanguageEditorProps) => {
  const allTranslationKeys = getAllTranslationKeys({ languages });
  const transformedLanguages = transformLanguages({
    translationKeys: allTranslationKeys,
    languages,
  });

  return (
    <div>
      {Object.keys(transformedLanguages).map((translationKey) => {
        const handleChangeKey = (e: React.ChangeEvent<HTMLInputElement>) => {
          e.preventDefault();

          onKeyChange({
            id: translationKey,
            newValue: e.currentTarget.value,
          });
        };
        return (
          <div
            key={translationKey}
            style={{
              padding: '2rem',
              display: 'grid',
              gridTemplateColumns: '1fr 2fr',
              gap: '1rem',
            }}
          >
            <div>
              <div>
                <label htmlFor={translationKey}>ID:</label>
              </div>
              <input
                id={translationKey}
                type='text'
                defaultValue={translationKey}
                style={{ width: '100%' }}
                onBlur={handleChangeKey}
              />
            </div>
            <div>
              {Object.keys(transformedLanguages[translationKey]).map(
                (language) => {
                  const id = `${translationKey}-${language}`;
                  const imgSrc = language === 'en' ? ukFlag : noFlag;

                  const handleChangeTranslation = (
                    e: React.ChangeEvent<HTMLInputElement>,
                  ) => {
                    e.preventDefault();
                    onTranslationChange({
                      translationKey,
                      langCode: language,
                      newValue: e.currentTarget.value,
                    });
                  };

                  return (
                    <div key={id}>
                      <div>
                        <label htmlFor={id}>
                          <img
                            src={imgSrc}
                            width='20'
                            height='20'
                            alt={language}
                          />
                          {language}:
                        </label>
                      </div>

                      <textarea
                        id={id}
                        style={{ width: '100%' }}
                        onBlur={handleChangeTranslation}
                        defaultValue={
                          transformedLanguages[translationKey][language]
                        }
                      />
                    </div>
                  );
                },
              )}
            </div>
          </div>
        );
      })}

      <pre>
        <code>{JSON.stringify(transformedLanguages, null, 2)}</code>
      </pre>
    </div>
  );
};

// <>
// {transformedLanguages[translationKey].map((language, index2) => {
// <div>
//   <input type="text" value={language} />
// </div>

// }
// </>
