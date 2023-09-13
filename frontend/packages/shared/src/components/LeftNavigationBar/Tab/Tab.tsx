import React, { ReactNode } from 'react';
import classes from './Tab.module.css';
import cn from 'classnames';
import { LeftNavigationTab, TabAction } from 'app-shared/types/LeftNavigationTab';
import { Paragraph } from '@digdir/design-system-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export type TabProps = {
  /**
   * The navigation tab
   */
  tab: LeftNavigationTab;
  /**
   * Classname for navigation element
   */
  navElementClassName: string;
  /**
   * Id of the new tab clicked
   */
  newTabIdClicked: string;
  /**
   * Function to execute on blur
   * @returns void
   */
  onBlur: () => void;
  onClick: () => void;
};

/**
 * @component
 *    Displays a tab in the left navigation bar.
 *
 * @example
 *      const displayTabs = tabs.map((tab: LeftNavigationTab) => (
 *        <Tab
 *          tab={tab}
 *          key={tab.tabId}
 *          navElementClassName={classes.navigationElement}
 *          onBlur={() => setNewTabIdClicked(null)}
 *          onClick={() => handleClick(tab.tabId)}
 *          newTabIdClicked={newTabIdClicked}
 *        />
 *      ));
 *
 * @property {LeftNavigationTab}[tab] - The navigation tab
 * @property {string}[navElementClassName] - Classname for navigation element
 * @property {number}[newTabIdClicked] - Id of the new tab clicked
 * @property {function}[onBlur] - Function to execute on blur
 * @property {function}[onClick] - Function to execute on click
 *
 * @returns {ReactNode} - The rendered component
 */
export const Tab = ({
  tab,
  navElementClassName,
  newTabIdClicked,
  onBlur,
  onClick,
  ...rest
}: TabProps): ReactNode => {
  const { t } = useTranslation();

  return (
    <Wrapper
      className={cn(
        tab.isActiveTab && classes.selected,
        newTabIdClicked === tab.tabId ? classes.newPage : navElementClassName
      )}
      onClick={onClick}
      onBlur={onBlur}
      action={tab.action}
      tabId={tab.tabId}
    >
      {tab.icon}
      <Paragraph as='span' size='small' short className={classes.buttonText}>
        {t(tab.tabName)}
      </Paragraph>
    </Wrapper>
  );
};

type WrapperProps = {
  className: string;
  onBlur: () => void;
  onClick: () => void;
  action: TabAction;
  children: ReactNode;
  tabId: string;
};
const Wrapper = ({ className, onBlur, onClick, action, children, tabId }: WrapperProps) => {
  switch (action.type) {
    case 'link': {
      return (
        <NavLink
          className={className}
          to={action.to}
          onBlur={onBlur}
          onClick={(e) => {
            if (action.onClick) {
              e.preventDefault();
              action.onClick(tabId);
            }
          }}
        >
          {children}
        </NavLink>
      );
    }
    case 'button': {
      return (
        <button className={className} onClick={onClick} onBlur={onBlur} type='button'>
          {children}
        </button>
      );
    }
  }
};
