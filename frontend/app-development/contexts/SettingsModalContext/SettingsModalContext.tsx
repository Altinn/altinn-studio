import React, { createContext, MutableRefObject, useContext, useRef } from 'react';
import { SettingsModalHandle } from '../../types/SettingsModalHandle';

export type SettingsModalContextProps = {
  settingsRef: MutableRefObject<SettingsModalHandle>;
};

export const SettingsModalContext = createContext<Partial<SettingsModalContextProps>>(undefined);

export type SettingsModalContextProviderProps = {
  children: React.ReactNode;
};

export const SettingsModalContextProvider = ({
  children,
}: Partial<SettingsModalContextProviderProps>) => {
  const settingsRef = useRef<SettingsModalHandle>(null);

  return (
    <SettingsModalContext.Provider value={{ settingsRef }}>
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
