import type { ReactNode } from 'react';
import React from 'react';
import { useTabProps } from '../hooks/useTabProps';

export type StudioContentMenuButtonTabProps<TabId extends string> = {
  icon: ReactNode;
  tabName: string;
  tabId: TabId;
};

export function StudioContentMenuButtonTab<TabId extends string>({
  icon,
  tabName,
  tabId,
}: StudioContentMenuButtonTabProps<TabId>): React.ReactElement {
  const props = useTabProps(icon, tabName, tabId);

  return <button {...props} />;
}
