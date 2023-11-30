import React, { useState } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { DeprecatedActions } from 'src/redux/deprecatedSlice';
import type { IProfile } from 'src/types/shared';

interface LanguageCtx {
  current: string;
  updateProfile: (profile: IProfile) => void;
  setWithLanguageSelector: (language: string) => void;
}

const { Provider, useCtx } = createContext<LanguageCtx>({
  name: 'Language',
  required: false,
  default: {
    current: 'nb',
    updateProfile: () => {
      throw new Error('LanguageProvider not initialized');
    },
    setWithLanguageSelector: () => {
      throw new Error('LanguageProvider not initialized');
    },
  },
});

export const LanguageProvider = ({ children }: PropsWithChildren) => {
  const current = useAppSelector((state) => state.deprecated.currentLanguage);
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const dispatch = useAppDispatch();

  const updateProfile = (profile: IProfile) => {
    setUserId(profile.userId);
    const localStorageKey = `selectedAppLanguage${window.app}${profile.userId ?? ''}`;
    const localStorageValue = localStorage.getItem(localStorageKey);
    const urlValue = getLanguageQueryParam();

    const newLanguage = urlValue ?? localStorageValue ?? profile.profileSettingPreference.language;
    dispatch(DeprecatedActions.setCurrentLanguage(newLanguage));
    localStorage.setItem(localStorageKey, newLanguage);
  };

  const setWithLanguageSelector = (language: string) => {
    dispatch(DeprecatedActions.setCurrentLanguage(language));
    localStorage.setItem(`selectedAppLanguage${window.app}${userId}`, language);
  };

  return <Provider value={{ current, updateProfile, setWithLanguageSelector }}>{children}</Provider>;
};

export const useCurrentLanguage = () => useCtx().current;
export const useSetCurrentLanguage = () => {
  const { setWithLanguageSelector, updateProfile } = useCtx();
  return { setWithLanguageSelector, updateProfile };
};

function getLanguageQueryParam() {
  const params = new URLSearchParams((window.location.hash || '').split('?')[1]);
  return params.get('lang');
}
