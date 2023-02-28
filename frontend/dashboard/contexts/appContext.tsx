import React, { useState } from 'react';
import { createStrictContext } from '../utils/createStrictContext';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';

type AppContext = {
  selectedContext: SelectedContextType | number;
  setSelectedContext: React.Dispatch<React.SetStateAction<number | SelectedContextType>>;
};

const [AppProvider, useAppContext] = createStrictContext<AppContext>();

type ServicesContextProviderProps = {
  children: React.ReactNode;
};
export const AppContextProvider = ({ children }: ServicesContextProviderProps) => {
  const [selectedContext, setSelectedContext] = useState<SelectedContextType | number>();
  return <AppProvider value={{ selectedContext, setSelectedContext }}>{children}</AppProvider>;
};

export { useAppContext };
