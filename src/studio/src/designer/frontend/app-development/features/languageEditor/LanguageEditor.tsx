import { LanguageEditor as BaseLanguageEditor } from '../../../language-editor';
import React, { useState } from 'react';
import { post } from 'app-shared/utils/networking';
import { useGetLanguages, getSaveTextResourcesUrl } from './utils';

export const LanguageEditor = () => {
  const { languages: initialLanguages } = useGetLanguages();
  const [isNewTextInput, setIsNewTextInput] = useState(false);
  const [sprak, setSprak] = useState([]);
  const [selectedSprak, setSelectedSprak] = useState(null);
  const [addNewSprak, setAddNewSprak] = useState();

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
    />
  );
};
