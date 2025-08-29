import type { ReactNode } from 'react';

interface TabLink {
  type: 'link';
  onClick?: (tabId: string) => void;
  to: string;
}

interface TabButton {
  type: 'button';
  onClick: (tabId: string) => void;
}

export type TabAction = TabLink | TabButton;

export interface LeftNavigationTab {
  icon: ReactNode;
  tabName: string;
  tabId: string;
  action: TabAction;
  isActiveTab: boolean;
}
