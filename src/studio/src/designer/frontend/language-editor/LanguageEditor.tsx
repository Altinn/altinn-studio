import React from 'react';

import AltinnColumnLayout from 'app-shared/components/AltinnColumnLayout';
import { LanguageRow } from './LanguageRow';

import { makeStyles, Typography } from '@material-ui/core';

export type Language =  Record<string, string>
export type OnTranslationChange= { translations: Language }

interface ILanguageEditorProps {
  language: Language
  onTranslationChange: ({ translations }: OnTranslationChange) => void;
  setLanguage: (language: Language) => void;
}

export const LanguageEditor = ({
  language,
  onTranslationChange,
  setLanguage
}:
ILanguageEditorProps) => {
  const classes = useStyles();

  const handleIdChange = ({
    oldValue,
    newValue,
  }: {
    oldValue: string;
    newValue: string;
  }) => {
    const updatedLanguage = {...language};
    updatedLanguage[newValue] = updatedLanguage[oldValue];
    delete updatedLanguage[oldValue];

    onTranslationChange({ translations: updatedLanguage });
  };

  const handleValueChange = ({newValue, translationKey}: {
    newValue: string;
    translationKey: string;
  }) => {
    const updatedLanguage = {
      ...language,
    };
    updatedLanguage[translationKey] = newValue;

    onTranslationChange({ translations: updatedLanguage });
  };

  return (
    <div style={{ paddingTop: "0", backgroundColor: "white", width: "100%", height: "100%"}} >
      <AltinnColumnLayout
        header={ '' }
        sideMenuChildren={
          <div className={classes.rightColBodyContainer}>
            <div>
              <Typography style={{ fontSize: '24px' }}>Språk</Typography>
            </div>
            <div className={classes.rightColBodyText}>
              <span>
                Vi anbefaler å legge til oversettelser for bokmål, nynorsk og
                engelsk. Ved behov kan du også legge til andre språk.
              </span>
            </div>
            <div className={classes.rightColBodyTextTwo}>
              <Typography style={{ fontSize: '16px', fontWeight: '700' }}>
                Aktive språk:
              </Typography>
            </div>
            <div className={classes.rightColBodyTextTwo}>
              <Typography style={{ fontSize: '14px', fontWeight: '400' }}>
                Legg til språk:
              </Typography>
            </div>
          </div>
        }
      >
        <div style={{ marginBottom: '10rem', backgroundColor: '#fff' }}>
          <div>
            {language && Object.keys(language).map((translationKey) => {
              return (
                <div key={translationKey}>
                  <LanguageRow
                    key={translationKey}
                    translationKey={translationKey}
                    transformedLanguages={language}
                    onIdChange={handleIdChange}
                    onValueChange={handleValueChange}
                    setLanguage={setLanguage}
                    onTranslationChange={onTranslationChange}
                  />
                </div>

              );
            })}
          </div>
        </div>
      </AltinnColumnLayout>
    </div>
  );
};

const useStyles = makeStyles({
  btn: {
    backgroundColor: '#17C96B',
    border: 'none',
    boxShadow: 'none',
    boxSizing: 'border-box',
    height: '36px',
    position: 'sticky',
    marginBottom: '29px',
    marginTop: '5rem',
    top: '177px',
    width: '100px',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    border: '2px dashed #ccc',
    height: '36px',
    width: '84px',
    active: {
      border: '2px dashed #000000',
    },
  },
  leftColBodyContainer: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFF',
    height: '100%',
    columnGap: '10rem',
    gridTemplateColumns: '1fr 2fr',
    gridAutoRows: 'minmax(100px, auto)',
    marginTop: '2rem',
    width: '100%',
  },
  lineBorder: {
    border: '1px solid #BCC7CC',
    marginTop: '2rem',
    top: '0px',
    width: '100%',
  },
  radioGroup: {
    width: '100%',
    display: 'flex',
    borderBottom: '1px solid #BCC7CC',
    marginBottom: '5px',
    padding: '1rem',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  rightColBodyContainer: {
    height: '100%',
    padding: '7rem',
    width: '100%',
  },
  rightColBodyText: {
    height: '100px',
    marginBottom: '2rem',
    top: '95px',
    left: '36px',
    lineHeight: '24.32px',
    width: '100%',
  },
  rightColBodyTextTwo: {
    height: '24px',
    lineHeight: '24px',
    marginBottom: '2rem',
    width: '100px',
  },
  stickyHeader: {
    borderBottom: '1px solid #BCC7CC',
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '1rem',
    position: 'sticky',
    marginBottom: '5rem',
    top: '0',
  },
});
