import type { RefObject } from 'react';
import { createContext } from 'react';

export interface AppContextProps {
  previewIframeRef: RefObject<HTMLIFrameElement>;
  selectedLayoutSet: string;
  setSelectedLayoutSet: (layoutSet: string) => void;
  removeSelectedLayoutSet: () => void;
}

export const AppContext = createContext<AppContextProps>(null);
