import { createContext, RefObject } from 'react';

export interface AppContextProps {
  previewIframeRef: RefObject<HTMLIFrameElement>;
  selectedLayoutSet: string;
  setSelectedLayoutSet: (layoutSet: string) => void;
  removeSelectedLayoutSet: () => void;
}

export const AppContext = createContext<AppContextProps>(null);
