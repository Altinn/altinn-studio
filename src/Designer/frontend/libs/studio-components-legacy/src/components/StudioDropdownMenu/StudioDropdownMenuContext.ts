import { createContext } from 'react';

export type StudioDropdownMenuContextProps = {
  setOpen: (open: boolean) => void;
};

export const StudioDropdownMenuContext = createContext<StudioDropdownMenuContextProps>(null);
