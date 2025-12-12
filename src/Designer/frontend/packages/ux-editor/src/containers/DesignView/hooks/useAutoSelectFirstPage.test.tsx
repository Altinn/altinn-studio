import React from 'react';
import { renderHook } from '@testing-library/react';
import { useAutoSelectFirstPage } from './useAutoSelectFirstPage';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { AppContext } from '../../../AppContext';
import type { AppContextProps } from '../../../AppContext';
import { ItemType } from '../../../components/Properties/ItemType';

describe('useAutoSelectFirstPage', () => {
  const mockSetSelectedFormLayoutName = jest.fn();
  const mockSetSelectedItem = jest.fn();

  const defaultAppContextProps: AppContextProps = {
    previewIframeRef: { current: null },
    selectedFormLayoutName: undefined,
    setSelectedFormLayoutName: mockSetSelectedFormLayoutName,
    updateLayoutsForPreview: jest.fn(),
    updateLayoutSetsForPreview: jest.fn(),
    updateLayoutSettingsForPreview: jest.fn(),
    updateTextsForPreview: jest.fn(),
    shouldReloadPreview: false,
    previewHasLoaded: jest.fn(),
    onLayoutSetNameChange: jest.fn(),
    selectedItem: null,
    setSelectedItem: mockSetSelectedItem,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppContext.Provider value={defaultAppContextProps}> {children} </AppContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call setSelectedFormLayoutName and setSelectedItem when pagesModel is available and not initialized', () => {
    const pagesModel: PagesModel = {
      pages: [{ id: 'page1' }, { id: 'page2' }],
    };
    renderHook(() => useAutoSelectFirstPage({ pagesModel, pagesQueryPending: false }), { wrapper });
    expect(mockSetSelectedFormLayoutName).toHaveBeenCalledWith('page1');
    expect(mockSetSelectedItem).toHaveBeenCalledWith({
      type: ItemType.Page,
      id: 'page1',
    });
  });

  it('should handle pagesModel with groups', () => {
    const pagesModel: PagesModel = {
      groups: [
        { order: [{ id: 'group1-page1' }, { id: 'group1-page2' }] },
        { order: [{ id: 'group2-page1' }] },
      ],
    };
    renderHook(() => useAutoSelectFirstPage({ pagesModel, pagesQueryPending: false }), { wrapper });
    expect(mockSetSelectedFormLayoutName).toHaveBeenCalledWith('group1-page1');
    expect(mockSetSelectedItem).toHaveBeenCalledWith({
      type: ItemType.Page,
      id: 'group1-page1',
    });
  });
});
