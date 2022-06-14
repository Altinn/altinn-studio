import { LanguageEditor as BaseLanguageEditor}  from '../../../language-editor';
import React from 'react';
import {useAppSelector} from 'common/hooks';

export const LanguageEditor = () => {

  const language = useAppSelector((state) => state);
  console.log("test")
  console.log(language);
  return <BaseLanguageEditor languages={{}}/>
}
