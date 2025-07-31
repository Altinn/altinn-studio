import type { AppContextProps } from '../AppContext';
import type { RefObject } from 'react';
import { layout1NameMock } from './layoutMock';

const previewIframeRefMock: RefObject<HTMLIFrameElement> = {
  current: null,
};

export const appContextMock: AppContextProps = {
  previewIframeRef: previewIframeRefMock,
  selectedFormLayoutName: layout1NameMock,
  setSelectedFormLayoutName: jest.fn(),
  updateLayoutSetsForPreview: jest.fn(),
  updateLayoutsForPreview: jest.fn(),
  updateLayoutSettingsForPreview: jest.fn(),
  updateTextsForPreview: jest.fn(),
  shouldReloadPreview: false,
  previewHasLoaded: jest.fn(),
  onLayoutSetNameChange: jest.fn(),
  selectedItem: null,
  setSelectedItem: jest.fn(),
};
