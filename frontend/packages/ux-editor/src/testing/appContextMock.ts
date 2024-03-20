import type { AppContextProps } from '../AppContext';
import type { RefObject } from 'react';

const previewIframeRefMock: RefObject<HTMLIFrameElement> = {
  current: null,
};

export const appContextMock: AppContextProps = {
  refetchLayouts: jest.fn(),
  refetchLayoutSettings: jest.fn(),
  refetchTexts: jest.fn(),
  reloadPreview: jest.fn(),
  previewIframeRef: previewIframeRefMock,
  invalidLayouts: [],
  setInvalidLayouts: jest.fn(),
};
