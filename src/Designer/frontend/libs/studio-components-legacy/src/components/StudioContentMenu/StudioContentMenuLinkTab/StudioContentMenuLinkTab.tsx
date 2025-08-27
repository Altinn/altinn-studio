import React from 'react';
import type { ReactNode } from 'react';
import { useTabProps } from '../hooks/useTabProps';
import { Button } from '@digdir/designsystemet-react';

export type StudioContentMenuLinkTabProps<TabId extends string> = {
  icon: ReactNode;
  tabName: string;
  tabId: TabId;
  renderTab: (props: React.HTMLAttributes<HTMLAnchorElement>) => React.ReactElement;
};

export function StudioContentMenuLinkTab<TabId extends string>({
  icon,
  tabName,
  tabId,
  renderTab,
}: StudioContentMenuLinkTabProps<TabId>): React.ReactElement {
  const props = useTabProps(icon, tabName, tabId);

  return (
    <Button size='sm' asChild>
      {renderTab(props)}
    </Button>
  );
}
