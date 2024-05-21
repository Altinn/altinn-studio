import React, { useState } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import type { IProfile } from 'src/types/shared';

interface LanguageCtx {
  current: string;
  profileLoaded: boolean;
  updateProfile: (profile: IProfile) => void;
  setWithLanguageSelector: (language: string) => void;
}

const { Provider, useCtx } = createContext<LanguageCtx>({
  name: 'Language',
  required: false,
  default: {
    current: 'nb',
    profileLoaded: false,
    updateProfile: () => {
      throw new Error('LanguageProvider not initialized');
    },
    setWithLanguageSelector: () => {
      throw new Error('LanguageProvider not initialized');
    },
  },
});

export const LanguageProvider = ({ children }: PropsWithChildren) => {
  const [current, setCurrent] = useState('nb');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [userId, setUserId] = useState<number | undefined>(undefined);

  const updateProfile = (profile: IProfile) => {
    setUserId(profile.userId);
    setProfileLoaded(true);
    const localStorageKey = `selectedAppLanguage${window.app}${profile.userId ?? ''}`;
    let localStorageValue = localStorage.getItem(localStorageKey);
    if (localStorageValue === 'null' || localStorageValue === 'undefined') {
      localStorageValue = null;
    }
    const urlValue = getLanguageQueryParam();

    const newLanguage = urlValue ?? localStorageValue ?? profile.profileSettingPreference.language ?? 'nb';
    setCurrent(newLanguage);
    localStorage.setItem(localStorageKey, newLanguage);
  };

  const setWithLanguageSelector = (language: string) => {
    setCurrent(language);
    localStorage.setItem(`selectedAppLanguage${window.app}${userId}`, language);
  };

  return <Provider value={{ current, profileLoaded, updateProfile, setWithLanguageSelector }}>{children}</Provider>;
};

export const useCurrentLanguage = () => useCtx().current;
export const useIsProfileLanguageLoaded = () => useCtx().profileLoaded;
export const useSetCurrentLanguage = () => {
  const { setWithLanguageSelector, updateProfile } = useCtx();
  return { setWithLanguageSelector, updateProfile };
};

function getLanguageQueryParam() {
  const params = new URLSearchParams((window.location.hash || '').split('?')[1]);
  return params.get('lang');
}
