import type { SettingsModalTab } from '../types/SettingsModalTab';
import React, { createContext, useContext, useState } from 'react';

export type SettingsModalContextProps = {
  settingsModalOpen: boolean;
  setSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  settingsModalSelectedTab?: SettingsModalTab;
  setSettingsModalSelectedTab: React.Dispatch<React.SetStateAction<SettingsModalTab>>;
};

export const SettingsModalContext = createContext<Partial<SettingsModalContextProps>>(undefined);

export type SettingsModalContextProviderProps = {
  children: React.ReactNode;
};

export const SettingsModalContextProvider = ({
  children,
}: Partial<SettingsModalContextProviderProps>) => {
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsModalSelectedTab, setSettingsModalSelectedTab] =
    useState<SettingsModalTab>('about');

  return (
    <SettingsModalContext.Provider
      value={{
        settingsModalOpen,
        setSettingsModalOpen,
        settingsModalSelectedTab,
        setSettingsModalSelectedTab,
      }}
    >
      {children}
    </SettingsModalContext.Provider>
  );
};

export const useSettingsModalContext = (): Partial<SettingsModalContextProps> => {
  const context = useContext(SettingsModalContext);
  if (context === undefined) {
    throw new Error('useSettingsModalContext must be used within a SettingsModalContextProvider');
  }
  return context;
};
