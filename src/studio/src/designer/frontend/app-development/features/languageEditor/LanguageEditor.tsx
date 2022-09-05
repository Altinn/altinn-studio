import { LanguageEditor as BaseLanguageEditor } from '../../../language-editor';
import React, { useState } from 'react';
import { post } from 'app-shared/utils/networking';

import { useGetLanguages, getSaveTextResourcesUrl } from './utils';

export const LanguageEditor = () => {
  const { languages: initialLanguages } = useGetLanguages();
  const [isNewTextInput, setIsNewTextInput] = useState(false);

  // Initial supported languages in the Aktive sprak list
  const [sprak, setSprak] = useState([
    { id: 'no', name: 'Bokmål' },
    { id: 'en', name: 'Engelsk' },
    { id: 'ny', name: 'Nynorsk' },
  ]);
  const [selectedSprak, setSelectedSprak] = useState(null);
  const [addNewSprak, setAddNewSprak] = useState();

  // List of available supported languages in the Legg til språk dropdown
  const [sprakOptions, setSprakOptions] = useState([
    { id: 'no', value: 'bokmål', label: 'Bokmål' },
    { id: 'en', value: 'en', label: 'Engelsk' },
    { id: 'no', value: 'nynorsk', label: 'Nynorsk' },
    { id: 'se', value: 'svensk', label: 'Svensk' },
    { id: 'de', value: 'tysk', label: 'Tysk' },
  ]);
  const [languages, setLanguages] = useState(initialLanguages);
  const [newSprakField, setNewSprakField] = useState({
    id: '',
    label: '',
    value: '',
  });

  React.useEffect(() => {
    setTimeout(() => {
      setLanguages(initialLanguages);
    }, 1000);
  });

  const handleKeyChange = ({
    id,
    newValue,
  }: {
    id: string;
    newValue: string;
  }) => {
    const updatedLanguages = {
      ...languages,
    };

    Object.keys(updatedLanguages).forEach((langCode) => {
      updatedLanguages[langCode][newValue] = updatedLanguages[langCode][id];

      delete updatedLanguages[langCode][id];
    });

    setLanguages(updatedLanguages);

    saveUpdatedLanguage({ updatedLanguages });
  };

  const handleTranslationChange = ({
    translationKey,
    langCode,
    newValue,
  }: {
    translationKey: string;
    langCode: string;
    newValue: string;
  }) => {
    const updatedLanguages = {
      ...languages,
      [langCode]: {
        ...languages[langCode],
        [translationKey]: newValue,
      },
    };

    setLanguages(updatedLanguages);

    saveUpdatedLanguage({ updatedLanguages });
  };

  const saveUpdatedLanguage = ({
    updatedLanguages,
  }: {
    updatedLanguages: Record<string, Record<string, string>>;
  }) => {
    Object.keys(updatedLanguages).forEach((langCode) => {
      post(
        getSaveTextResourcesUrl(langCode),
        JSON.stringify(updatedLanguages[langCode]),
        {
          headers: {
            'Content-type': 'application/json',
          },
        },
      );
    });
  };

  React.useEffect(() => {
    const newValues = sprakOptions.filter((d) => {
      const data = sprak.find(
        (s) => s.name.toLowerCase() === d.label.toLowerCase(),
      );
      return !data;
    });
    setSprakOptions(newValues);
  }, []);

  return (
    <BaseLanguageEditor
      addNewSprak={addNewSprak}
      isNewTextInput={isNewTextInput}
      languages={languages}
      onKeyChange={handleKeyChange}
      onTranslationChange={handleTranslationChange}
      selectedSprak={selectedSprak}
      setSelectedSprak={setSelectedSprak}
      setIsNewTextInput={setIsNewTextInput}
      setAddNewSprak={setAddNewSprak}
      newSprakField={newSprakField}
      setNewSprakField={setNewSprakField}
      sprak={sprak}
      setSprak={setSprak}
      sprakOptions={sprakOptions}
      setSprakOptions={setSprakOptions}
    />
  );
};
