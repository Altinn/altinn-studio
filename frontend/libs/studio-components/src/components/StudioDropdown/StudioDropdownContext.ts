import { createContext } from 'react';

const defaultContextValue: StudioDropdownContextProps = {
  setOpen() {},
};

export type StudioDropdownContextProps = {
  setOpen: (open: boolean) => void;
};

export const StudioDropdownContext = createContext<StudioDropdownContextProps>(defaultContextValue);
