import { AppContextProps } from '../AppContext';
import { RefObject } from 'react';

const previewIframeRefMock: RefObject<HTMLIFrameElement> = {
  current: null
};

export const appContextMock: AppContextProps = {
  previewIframeRef: previewIframeRefMock,
  selectedLayoutSet: 'test-layout-set',
  setSelectedLayoutSet: (layoutSet: string) => {},
  removeSelectedLayoutSet: () => {},
};
