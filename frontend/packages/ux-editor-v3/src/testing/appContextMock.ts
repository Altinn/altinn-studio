import type { AppContextProps } from '../AppContext';
import type { RefObject } from 'react';
import { layoutSet1NameMock } from './layoutSetMock';

const previewIframeRefMock: RefObject<HTMLIFrameElement> = {
  current: null,
};

export const appContextMock: AppContextProps = {
  previewIframeRef: previewIframeRefMock,
  selectedLayoutSet: layoutSet1NameMock,
  setSelectedLayoutSet: (layoutSet: string) => {},
  removeSelectedLayoutSet: () => {},
};
