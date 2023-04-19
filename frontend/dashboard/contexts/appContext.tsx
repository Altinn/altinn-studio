import React, { useMemo } from 'react';
import { createStrictContext } from '../utils/createStrictContext';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { useSearchParamsState } from 'dashboard/hooks/useSearchParamsState';

type AppContext = {
  selectedContext: SelectedContextType | number;
  setSelectedContext: React.Dispatch<React.SetStateAction<number | SelectedContextType>>;
};

const [AppProvider, useAppContext] = createStrictContext<AppContext>();

type ServicesContextProviderProps = {
  children: React.ReactNode;
};
export const AppContextProvider = ({ children }: ServicesContextProviderProps) => {
  const [selectedContext, setSelectedContext] = useSearchParamsState<SelectedContextType | number>(
    'context',
    SelectedContextType.Self,
    (value: string) => {
      return Object.values(SelectedContextType).some(item => item === value) ? value as SelectedContextType : Number(value);
    }
  );

  const providerValue = useMemo(() => ({ selectedContext, setSelectedContext }), [selectedContext, setSelectedContext]);
  return <AppProvider value={providerValue}>{children}</AppProvider>;
};

export { useAppContext };
