import { TabAction } from 'app-shared/types/LeftNavigationTab';
import React, { KeyboardEventHandler, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

export type TabWrapperProps = {
  className: string;
  onBlur: () => void;
  onClick?: () => void;
  action: TabAction;
  children: ReactNode;
  tabIndex: number;
  tabName: string;
  onKeyDown: (name: string) => (event: Parameters<KeyboardEventHandler>[0]) => void;
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
 *    >
 *      {children}
 *    </TabWrapper>
 *
 * @property {string}[className] - Classname of the component
 * @property {function}[onBlur] - Fucntion to execute on blur
 * @property {function}[onClick] - Function to execute on click
 * @property {TabAction}[action] - The tab action
 * @property {ReactNode}[children] - Children of the component
 *
 * @returns {ReactNode} - The rendered component
 */
export const TabWrapper = ({
  className,
  onBlur,
  onClick,
  action,
  children,
  tabIndex,
  tabName,
  onKeyDown,
}: TabWrapperProps): ReactNode => {
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
          onKeyDown={onKeyDown(tabName)}
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
          onKeyDown={onKeyDown(tabName)}
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
