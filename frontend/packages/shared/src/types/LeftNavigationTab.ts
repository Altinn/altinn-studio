import { ReactNode } from 'react';

interface TabLink {
  type: 'link';
  onClick?: (tabId: string) => void;
  to: string;
  onKeyDown: (e: React.KeyboardEvent<HTMLAnchorElement>) => void;
}

interface TabButton {
  type: 'button';
  onClick: (tabId: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}

export type TabAction = TabLink | TabButton;

export interface LeftNavigationTab {
  icon: ReactNode;
  tabName: string;
  tabId: string;
  action: TabAction;
  isActiveTab: boolean;
}
