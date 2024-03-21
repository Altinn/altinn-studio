import type { AppContextProps } from '../AppContext';
import type { RefObject } from 'react';

const previewIframeRefMock: RefObject<HTMLIFrameElement> = {
  current: null,
};

export const appContextMock: AppContextProps = {
  previewIframeRef: previewIframeRefMock,
  selectedFormLayoutSetName: 'test-layout-set',
  setSelectedFormLayoutSetName: jest.fn(),
  removeSelectedFormLayoutSetName: jest.fn(),
  refetchLayouts: jest.fn(),
  refetchLayoutSettings: jest.fn(),
  refetchTexts: jest.fn(),
  reloadPreview: jest.fn(),
};
