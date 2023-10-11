import { createContext, RefObject } from 'react';

export interface AppContextProps {
  previewIframeRef: RefObject<HTMLIFrameElement>;
}

export const AppContext = createContext<AppContextProps>({
  previewIframeRef: null,
});
