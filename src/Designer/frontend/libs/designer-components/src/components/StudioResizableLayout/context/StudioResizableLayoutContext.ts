import type { Dispatch, SetStateAction } from 'react';
import { createContext } from 'react';
import type { StudioResizableOrientation } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';

export type StudioResizableLayoutContextProps = {
  orientation: StudioResizableOrientation;
  containerSizes: number[];
  isResizing: boolean;
  resizeDelta: (index: number, size: number) => void;
  resizeTo: (index: number, size: number) => void;
  setIsResizing: Dispatch<SetStateAction<boolean>>;
};

export const StudioResizableLayoutContext = createContext<
  Partial<StudioResizableLayoutContextProps> | undefined
>(undefined);
