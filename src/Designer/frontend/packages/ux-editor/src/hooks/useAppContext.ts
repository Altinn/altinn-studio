import { useContext } from 'react';
import type { AppContextProps } from '../AppContext';
import { AppContext } from '../AppContext';

export const useAppContext = (): Partial<AppContextProps> => {
  const context = useContext(AppContext);
  if (context === null) {
    throw new Error('useAppContext must be used within a AppContextProvider');
  }
  return context;
};
