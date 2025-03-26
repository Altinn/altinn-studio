import { createContext } from 'react';

export type StudioDropdownContextProps = {
  setOpen: (open: boolean) => void;
};

export const StudioDropdownContext = createContext<StudioDropdownContextProps>(null);
