import React from 'react';
import type { ReactNode } from 'react';
import { useTabProps } from '../hooks/useTabProps';
import { StudioButton } from '@studio/components';

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

  return <StudioButton {...props} color='first' />;
}
