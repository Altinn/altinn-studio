/* eslint-disable-next-line */
// @ts-nocheck

import React from 'react';
import Select from 'react-select';

import type { ILanguageEditor } from './utils';

import { Button, TextField } from '@altinn/altinn-design-system';

import AltinnColumnLayout from 'app-shared/components/AltinnColumnLayout';
import AltinnRadioGroup from 'app-shared/components/AltinnRadioGroup';

import { getAllTranslationKeys, transformLanguages } from './utils';

import noFlag from './no.png';
import ukFlag from './uk.png';

import { makeStyles, Typography } from '@material-ui/core';
import axios from 'axios';

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
    display: 'grid',
    height: '100%',
    gridTemplateColumns: '1fr 2fr',
    margin: '3rem 0 2rem 0',
    padding: '0.5rem',
    width: '100%',
  },
  lineBorder: {
    border: '0.5px solid #BCC7CC',
    position: 'sticky',
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
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  rightColBodyContainer: {
    height: '100%',
    padding: '7rem',
    width: '100%',
  },
  stickyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    position: 'sticky',
    top: '0',
  },
});

interface ILanguageEditorProps extends ILanguageEditor {
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
  newSprakField,
  setNewSprakField,
  isNewTextInput,
  sprakOptions,
  sprak,
  setSprak,
  selectedSprak,
  setSelectedSprak,
  languages,
  setSprakOptions,
  setIsNewTextInput,
}: // onKeyChange,
// onTranslationChange,
ILanguageEditorProps) => {
  const classes = useStyles();
  const allTranslationKeys = getAllTranslationKeys({ languages });
  const transformedLanguages = transformLanguages({
    translationKeys: allTranslationKeys,
    languages,
  });

  const handleSelectOnChange = (event) => {
    setSelectedSprak(event);
  };
  const handleLeggTilNyttSprak = (event) => {
    event.currentTarget.disabled = true;
    const newSprak = { id: selectedSprak.value, name: selectedSprak.label };
    setSprak([...sprak, newSprak]);
    event.currentTarget.disabled = false;
    setSelectedSprak('');

    const newValues = sprakOptions.filter((d) => {
      const data = sprak.find(
        (s) => s.name.toLowerCase() === d.label.toLowerCase(),
      );
      return !data;
    });
    const newerValues = newValues.filter(
      (d) => d.label.toLowerCase() !== selectedSprak.label.toLowerCase(),
    );
    setSprakOptions(newerValues);
  };

  const handleAddNewTextField = () => {
    setIsNewTextInput((prev) => !prev);
  };
  const updateUIList = (s) => {
    setNewSprakField({ ...s, value: '' });
  };

  const handleUpdateLanguage = async (nb) => {
    const index = nb.findIndex(
      (x) => x.translationKey === languageToUpdate.translationKey,
    );
    const updateLanguage = [...nb];
    updateLanguage[index] = languageToUpdate;
    setNb(updateLanguage);
    setForEditing(0);
  };

  return (
    <div>
      <AltinnColumnLayout
        sideMenuChildren={
          <div className={classes.rightColBodyContainer}>
            <div
              style={{
                height: '58px',
                width: '65px',
                top: '36px',
                left: '36px',
              }}
            >
              <Typography style={{ fontSize: '24px' }}>Språk</Typography>
            </div>
            <div
              style={{
                height: '72px',
                marginBottom: '2rem',
                top: '95px',
                left: '36px',
                lineHeight: '24.32px',
                width: '323px',
              }}
            >
              <span>
                Vi anbefaler å legge til oversettelser for bokmål, nynorsk og
                engelsk. Ved behov kan du også legge til andre språk.
              </span>
            </div>

            <div
              style={{
                height: '24px',
                lineHeight: '24px',
                marginBottom: '2rem',
                width: '100px',
              }}
            >
              <Typography style={{ fontSize: '16px', fontWeight: '700' }}>
                Aktive språk:
              </Typography>
            </div>
            <AltinnRadioGroup
              key={sprak.id}
              value={sprak}
              style={{ width: '100%' }}
            >
              {sprak?.map((sprak, index) => {
                return (
                  <div id={sprak.id} key={index} className={classes.radioGroup}>
                    <div
                      style={{
                        width: '100%',
                        gap: '1rem',
                        display: 'flex',
                      }}
                    >
                      <div>
                        <label htmlFor={sprak.id}>
                          <img
                            id={sprak.id}
                            src={sprak.id === 'en' ? ukFlag : noFlag}
                            width='25'
                            height='25'
                            alt={sprak.name}
                          />
                        </label>
                      </div>
                      <div>{sprak.name}</div>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        gap: '1rem',
                        display: 'flex',
                      }}
                    >
                      <div>
                        <input
                          type='radio'
                          name='sprak'
                          value={sprak.id}
                          onChange={() => {
                            updateUIList(sprak);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </AltinnRadioGroup>

            <div
              style={{
                height: '19px',
                width: '317px',
                margin: '5rem 0 1rem 0',
              }}
            >
              <Typography style={{ fontSize: '14px', fontWeight: '400' }}>
                Legg til språk:
              </Typography>
            </div>
            <div
              style={{
                display: 'flex',
                width: '400px',
                justifyContent: 'space-evenly',
              }}
            >
              <div style={{ width: '280px' }}>
                <Select
                  onChange={handleSelectOnChange}
                  options={sprakOptions}
                  value={selectedSprak}
                />
              </div>
              <div style={{ alignContent: 'end' }}>
                <Button
                  onClick={handleLeggTilNyttSprak}
                  className={classes.btnSecondary}
                  disabled={!selectedSprak}
                >
                  Legg til
                </Button>
              </div>
            </div>
            <div className={classes.lineBorder} />
          </div>
        }
      >
        <div>
          <div className={classes.stickyHeader}>
            <Button
              id='nyTekstBtn'
              onClick={handleAddNewTextField}
              disabled={false}
              className={classes.btn}
            >
              {isNewTextInput ? 'Cancel' : '+ Ny tekst'}
            </Button>
          </div>

          {isNewTextInput && (
            <div className={classes.leftColBodyContainer}>
              <div style={{ marginRight: '2rem', width: '246px' }}>
                <div>
                  <label htmlFor={newSprakField.id}>ID</label>
                </div>
                <TextField type='text' label='Id' />
              </div>
              <div>
                <div>
                  <label>{newSprakField.name}</label>
                </div>
                <TextField
                  type='text'
                  label='Tekst'
                  onChange={(e) => {
                    setNewSprakField({
                      ...newSprakField,
                      value: e.target.value,
                    });
                  }}
                />
              </div>
            </div>
          )}
          <div>
            {Object.keys(transformedLanguages).map((translationKey) => {
              return (
                <div
                  key={translationKey}
                  className={classes.leftColBodyContainer}
                >
                  <div style={{ marginRight: '2rem', width: '246px' }}>
                    <div>
                      <label htmlFor={translationKey}>ID</label>
                    </div>
                    <TextField
                      disabled={true}
                      defaultValue={translationKey}
                      type='text'
                      onKeyUp={handleUpdateLanguage}
                    />
                  </div>
                  <div>
                    {Object.keys(transformedLanguages[translationKey]).map(
                      (language) => {
                        const id = `${translationKey}-${language}`;
                        const imgSrc = language === 'uk' ? ukFlag : noFlag;

                        return (
                          <div key={id}>
                            <div>
                              <label htmlFor={id}>
                                <img
                                  src={imgSrc}
                                  width='25'
                                  height='25'
                                  alt={newSprakField.name ?? language}
                                />
                                {newSprakField.name ?? language}
                              </label>
                            </div>
                            <TextField
                              id={id}
                              defaultValue={
                                transformedLanguages[translationKey][language]
                              }
                              //temporary axios placeholder for POC purposes
                              onChange={async (e) => {
                                await axios.put('http://localhost:5050/nb', {
                                  ...languages?.Bokmal,
                                  [translationKey]: e.target.value,
                                });
                                // TODO: update UI list
                              }}
                            />
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AltinnColumnLayout>
    </div>
  );
};
