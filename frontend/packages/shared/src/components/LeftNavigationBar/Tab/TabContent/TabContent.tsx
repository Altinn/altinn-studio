import type { TabAction } from 'app-shared/types/LeftNavigationTab';
import type { ReactNode } from 'react';
import React from 'react';
import { NavLink } from 'react-router-dom';

export type TabContentProps = {
  className: string;
  onBlur: () => void;
  onClick?: () => void;
  action: TabAction;
  children: ReactNode;
  tabIndex: number;
  onKeyDown: (event: React.KeyboardEvent) => void;
};

/**
 * @component
 *    Displays a Wrapper around each tab. The type of the wrapper
 *    is decided by the type of the action provided to the component.
 *
 * @example
 *    <TabWrapper
 *      className='.className'
 *      onClick={onClick}
 *      onBlur={onBlur}
 *      action={tab.action}
 *      tabIndex={tabIndex}
 *      tabName={tab.tabName}
 *      onKeyDown={onKeyDown}
 *    >
 *      {children}
 *    </TabWrapper>
 *
 * @property {string}[className] - Classname of the component
 * @property {function}[onBlur] - Fucntion to execute on blur
 * @property {function}[onClick] - Function to execute on click
 * @property {TabAction}[action] - The tab action
 * @property {ReactNode}[children] - Children of the component
 * @property {number}[tabIndex] - The index of the tab
 * @property {function}[onKeyDown] - Function to be executed on key press
 *
 * @returns {ReactNode} - The rendered component
 */
export const TabContent = ({
  className,
  onBlur,
  onClick,
  action,
  children,
  tabIndex,

  onKeyDown,
}: TabContentProps): ReactNode => {
  /**
   * Executes the on click of the action if it exists and type is link
   */
  const handleClickLink = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (action.onClick && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  /**
   * Based on the type of the action, render different components as wrapper
   */
  switch (action.type) {
    case 'link': {
      return (
        <NavLink
          className={className}
          to={action.to}
          onBlur={onBlur}
          onClick={handleClickLink}
          onKeyDown={onKeyDown}
          role='tab'
          tabIndex={tabIndex}
        >
          {children}
        </NavLink>
      );
    }
    case 'button': {
      return (
        <button
          className={className}
          onClick={() => (onClick ? onClick() : null)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          type='button'
          role='tab'
          tabIndex={tabIndex}
        >
          {children}
        </button>
      );
    }
  }
};
