import { createContext } from 'react';

export type RowContextProps = {
  updateMaxTextareaScrollHeight: () => void;
};

export const RowContext = createContext<RowContextProps>(null);
