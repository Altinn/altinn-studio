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
  selectedLayoutSet: '',
  setSelectedLayoutSet: jest.fn(),
  removeSelectedLayoutSet: jest.fn(),
  invalidLayouts: [],
  setInvalidLayouts: jest.fn(),
};
