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
  setSelectedformLayoutSetName: jest.fn(),
  selectedFormLayoutName: layout1NameMock,
  setSelectedFormLayoutName: jest.fn(),
  updateLayoutsForPreview: jest.fn(),
  updateLayoutSettingsForPreview: jest.fn(),
  updateTextsForPreview: jest.fn(),
  shouldReloadPreview: false,
  previewHasLoaded: jest.fn(),
  onLayoutSetNameChange: jest.fn(),
};
