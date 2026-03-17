import { createContext } from 'react';
import type { StudioResizableOrientation } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';

export type StudioResizableLayoutContextProps = {
  orientation: StudioResizableOrientation;
  containerSizes: number[];
  resizeDelta: (index: number, size: number) => void;
  resizeTo: (index: number, size: number) => void;
};

export const StudioResizableLayoutContext = createContext<
  Partial<StudioResizableLayoutContextProps> | undefined
>(undefined);
