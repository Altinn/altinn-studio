import React from 'react';
import type { SettingsModalTab } from 'app-development/types/SettingsModalTab';
import { createNavigationTab } from './index';
import { TestFlaskIcon } from '@navikt/aksel-icons';
import type { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';

const mockTabId1: SettingsModalTab = 'about';
const mockTabId2: SettingsModalTab = 'policy';
const mockCurrentTab: SettingsModalTab = mockTabId1;

describe('settingsModalUtils', () => {
  describe('createNavigationTab', () => {
    const mockIcon = <TestFlaskIcon />;
    const mockOnClick = jest.fn();

    it('creates a LeftNavigationTab with the provided parameters', () => {
      const navigationTab: LeftNavigationTab = createNavigationTab(
        mockIcon,
        mockTabId1,
        mockOnClick,
        mockCurrentTab,
      );

      expect(navigationTab.icon).toEqual(mockIcon);
      expect(navigationTab.tabName).toEqual(`settings_modal.left_nav_tab_${mockTabId1}`);
      expect(navigationTab.tabId).toEqual(mockTabId1);
      expect(navigationTab.action.type).toEqual('button');
      expect(navigationTab.action.onClick).toEqual(mockOnClick);
      expect(navigationTab.isActiveTab).toEqual(true);
    });

    it('creates a LeftNavigationTab with isActiveTab set to false when currentTab does not match tabId', () => {
      const navigationTab: LeftNavigationTab = createNavigationTab(
        mockIcon,
        mockTabId2,
        mockOnClick,
        mockCurrentTab,
      );

      expect(navigationTab.isActiveTab).toEqual(false);
    });
  });
});
