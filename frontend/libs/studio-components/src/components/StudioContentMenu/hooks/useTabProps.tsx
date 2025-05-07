import type { HTMLAttributes, ReactNode } from 'react';
import React from 'react';
import { useStudioContentMenuContext } from '../context/StudioContentMenuContext';
import type { HTMLTabElement } from '../utils/dom-utils';
import { moveFocus } from '../utils/dom-utils';
import classes from './useTabProps.module.css';
import { StudioMenuTab } from '../StudioMenuTab';
import cn from 'classnames';

export function useTabProps<TabId extends string>(
  icon: ReactNode,
  tabName: string,
  tabId: TabId,
): HTMLAttributes<HTMLTabElement> {
  const { isTabSelected, onChangeTab } = useStudioContentMenuContext();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTabElement>): void => {
    moveFocus(event);
  };

  const props: React.HTMLAttributes<HTMLTabElement> = {
    className: cn(classes.tab, isTabSelected && isTabSelected(tabId) ? classes.selected : null),
    role: 'tab',
    tabIndex: isTabSelected && isTabSelected(tabId) ? 0 : -1,
    onClick: () => onChangeTab && onChangeTab(tabId),
    onKeyDown: handleKeyDown,
    children: <StudioMenuTab icon={icon} tabName={tabName} key={tabId} />,
    title: tabName,
  };

  return props;
}
