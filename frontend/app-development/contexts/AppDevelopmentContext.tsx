import type { SettingsModalTab } from 'app-development/types/SettingsModalTab';
import React, { createContext, useContext, useState } from 'react';

export type AppDevelopmentContextProps = {
  settingsModalOpen: boolean;
  setSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  settingsModalSelectedTab?: SettingsModalTab;
  setSettingsModalSelectedTab: React.Dispatch<React.SetStateAction<SettingsModalTab>>;
};

export const AppDevelopmentContext = createContext<Partial<AppDevelopmentContextProps>>(undefined);

export type AppDevelopmentContextProviderProps = {
  children: React.ReactNode;
};

export const AppDevelopmentContextProvider = ({
  children,
}: Partial<AppDevelopmentContextProviderProps>) => {
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsModalSelectedTab, setSettingsModalSelectedTab] =
    useState<SettingsModalTab>('about');

  return (
    <AppDevelopmentContext.Provider
      value={{
        settingsModalOpen,
        setSettingsModalOpen,
        settingsModalSelectedTab,
        setSettingsModalSelectedTab,
      }}
    >
      {children}
    </AppDevelopmentContext.Provider>
  );
};

export const useAppDevelopmentContext = (): Partial<AppDevelopmentContextProps> => {
  const context = useContext(AppDevelopmentContext);
  if (context === undefined) {
    throw new Error('useAppDevelopmentContext must be used within a AppDevelopmentContextProvider');
  }
  return context;
};
