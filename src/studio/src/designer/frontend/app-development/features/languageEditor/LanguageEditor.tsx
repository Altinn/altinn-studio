import { LanguageEditor as BaseLanguageEditor } from '../../../language-editor';
import React, { useState } from 'react';
import { useGetLanguages, updateLanguage } from './utils';

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

  const handleTranslationChange = ({
    translations,
  }: Record<string, string>) => {
    updateLanguage({ translations });
  };

  return (
    <BaseLanguageEditor
      addNewSprak={addNewSprak}
      isNewTextInput={isNewTextInput}
      languages={languages}
      selectedSprak={selectedSprak}
      setSelectedSprak={setSelectedSprak}
      setIsNewTextInput={setIsNewTextInput}
      setAddNewSprak={setAddNewSprak}
      newSprakField={newSprakField}
      setNewSprakField={setNewSprakField}
      sprak={sprak}
      setSprak={setSprak}
      onTranslationChange={handleTranslationChange}
    />
  );
};
