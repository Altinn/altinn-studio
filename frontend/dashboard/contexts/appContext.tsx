import React, { useMemo, useState } from 'react';
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
  const [selectedContext, setSelectedContext] = useState<SelectedContextType | number>(
    SelectedContextType.Self
  );

  const providerValue = useMemo(() => ({ selectedContext, setSelectedContext }), [selectedContext]);
  return <AppProvider value={providerValue}>{children}</AppProvider>;
};

export { useAppContext };
