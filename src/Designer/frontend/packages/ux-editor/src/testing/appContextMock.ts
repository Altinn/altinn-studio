import { vi } from 'vitest';
import type { AppContextProps } from '../AppContext';
import type { RefObject } from 'react';
import { layout1NameMock } from './layoutMock';

const previewIframeRefMock: RefObject<HTMLIFrameElement | null> = {
  current: null,
};

export const appContextMock: AppContextProps = {
  previewIframeRef: previewIframeRefMock,
  selectedFormLayoutName: layout1NameMock,
  setSelectedFormLayoutName: vi.fn(),
  updateLayoutSetsForPreview: vi.fn(),
  updateLayoutsForPreview: vi.fn(),
  updateLayoutSettingsForPreview: vi.fn(),
  updateTextsForPreview: vi.fn(),
  shouldReloadPreview: false,
  previewHasLoaded: vi.fn(),
  onLayoutSetNameChange: vi.fn(),
  selectedItem: null,
  setSelectedItem: vi.fn(),
};
