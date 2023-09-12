import { ReactNode } from 'react';

export interface LeftNavigationTab {
  icon: ReactNode;
  tabName: string;
  tabId: number;
  onClick: (tabId: number) => void;
  isActiveTab: boolean;
}
