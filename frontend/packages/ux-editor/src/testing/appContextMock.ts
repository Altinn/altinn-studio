import type { AppContextProps } from '../AppContext';
import type { RefObject } from 'react';
import { layout1NameMock, layoutSetsMock } from './layoutMock';

const previewIframeRefMock: RefObject<HTMLIFrameElement> = {
  current: null,
};

export const appContextMock: AppContextProps = {
  previewIframeRef: previewIframeRefMock,
  selectedFormLayoutSetName: layoutSetsMock.sets[0].id,
  setSelectedFormLayoutSetName: jest.fn(),
  removeSelectedFormLayoutSetName: jest.fn(),
  selectedFormLayoutName: layout1NameMock,
  setSelectedFormLayoutName: jest.fn(),
  refetchLayouts: jest.fn(),
  refetchLayoutSettings: jest.fn(),
  refetchTexts: jest.fn(),
  reloadPreview: jest.fn(),
};
