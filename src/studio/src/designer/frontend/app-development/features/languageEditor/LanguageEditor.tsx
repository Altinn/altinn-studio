import { LanguageEditor as BaseLanguageEditor } from '../../../language-editor';
import React, { useState } from 'react';
import { useGetLanguages, updateLanguage } from './utils';
import type {OnTranslationChange} from '../../../language-editor';

export const LanguageEditor = () => {
  const { language: initialLanguage } = useGetLanguages();
  const [language, setLanguage] = useState(initialLanguage);

  React.useEffect(() => {
    setTimeout(() => {
      setLanguage(initialLanguage);
    }, 1000);
  });

  const handleTranslationChange = ({
    translations,
  }: OnTranslationChange) => {
    updateLanguage({ translations });
  };

  return (
    <BaseLanguageEditor
      language={language}
      onTranslationChange={handleTranslationChange}
    />
  );
};
