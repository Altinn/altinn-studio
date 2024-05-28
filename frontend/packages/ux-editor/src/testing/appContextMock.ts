import type { AppContextProps } from '../AppContext';
import type { RefObject } from 'react';
import { layoutSet1NameMock } from './layoutSetsMock';
import { layout1NameMock } from './layoutMock';

const previewIframeRefMock: RefObject<HTMLIFrameElement> = {
  current: null,
};

export const appContextMock: AppContextProps = {
  previewIframeRef: previewIframeRefMock,
  selectedFormLayoutSetName: layoutSet1NameMock,
  setSelectedFormLayoutSetName: jest.fn(),
  selectedFormLayoutName: layout1NameMock,
  setSelectedFormLayoutName: jest.fn(),
  refetchLayouts: jest.fn(),
  refetchLayoutSettings: jest.fn(),
  refetchTexts: jest.fn(),
  shouldReloadPreview: false,
  previewHasLoaded: jest.fn(),
};
