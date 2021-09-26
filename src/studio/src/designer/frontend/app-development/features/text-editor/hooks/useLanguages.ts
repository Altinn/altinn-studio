import * as React from 'react'
import {
  deleteLanguage,
  getCulturesResponse,
  getCulturesUrl,
  getLanguagesResponse,
  getLanguagesUrl,
  Languages,
} from "../api";
import useFetch from "./useFetch";

type CultureList = { id: Languages; name: string }[];
export type CultureData = { active: CultureList; cultures: CultureList };
export type useLanguagesResponse = {
  removeLanguage: (l: Languages) => void;
  addLanguage: (l: Languages) => void;
  data: CultureData | undefined;
  loading: boolean;
  error: any;
};

export default function useLanguages(): useLanguagesResponse {
  const langResponse = useFetch<getLanguagesResponse>(getLanguagesUrl());
  const cultures = useFetch<getCulturesResponse>(getCulturesUrl());
  const [extraLang, setExtraLang] = React.useState<Languages[]>([]);
  const [removedLang, setRemovedLang] = React.useState<Languages[]>([]);

  return React.useMemo(() => {
    const addLanguage = (lang: Languages) => {
      // Possibilites
      // 1. lang does not exist => ignore
      if (!cultures.data?.cultures.some(c => c.id == lang)) return;
      // 2. lang is already active => ignore
      if ([...langResponse.data, ...extraLang].indexOf(lang) !== -1) return;
      // 3. lang has previously been removed => don't list as removed and continue
      if (removedLang.indexOf(lang) !== -1) {
        setRemovedLang(prev => prev.filter(l => l !== lang))
      }
      // 4. if lang was not active originally, it needs to be an extraLang
      if (langResponse.data.indexOf(lang) === -1) {
        setExtraLang(prev => ([...prev, lang]))
      };
    }
    const removeLanguage = (lang: Languages) => {
      const language = cultures.data.cultures.find(c=>c.id===lang)?.name
      if (window.confirm(`Er du sikker på at du vil slette ${language} (${lang})?`)) {
        if (langResponse.data.some(c => c === lang)) {
          // language exist on server
          setRemovedLang(prev => ([...prev, lang]))
          deleteLanguage(lang)
        }
        if (extraLang.some(c => c === lang)) {
          // language does not exist on server
          setExtraLang(prev => prev.filter(l => l !== lang))
        }
      }
    }
    if (langResponse.error || cultures.error) {
      return {
        removeLanguage,
        addLanguage,
        data: undefined,
        loading: false,
        error: langResponse.error || cultures.error,
      };
    }
    if (langResponse.loading || cultures.loading) {
      return {
        removeLanguage,
        addLanguage,
        data: undefined,
        loading: true,
        error: undefined,
      };
    }

    return {
      removeLanguage,
      addLanguage,
      data: {
        active: [...langResponse.data, ...extraLang].filter(code => removedLang.indexOf(code) === -1).map(
          (code) =>
            cultures.data.cultures.find((culture) => culture.id === code) || {
              id: code,
              name: code,
            }
        ),
        cultures: cultures.data.cultures,
      },
      loading: false,
      error: undefined,
    };
  }, [langResponse.data, langResponse.error, langResponse.loading, cultures.data, cultures.loading, cultures.error, extraLang, removedLang])
}
