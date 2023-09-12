import React, { ReactNode } from 'react';
import classes from './Tab.module.css';
import cn from 'classnames';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { Paragraph } from '@digdir/design-system-react';

export type TabProps = {
  tab: LeftNavigationTab;
  navElementClassName: string;
  newTabIdClicked: number;
  onBlur: () => void;
  onClick: () => void;
};

export const Tab = ({
  tab,
  navElementClassName,
  newTabIdClicked,
  onBlur,
  onClick,
}: TabProps): ReactNode => {
  return (
    <button
      className={cn(
        tab.isActiveTab && classes.selected,
        newTabIdClicked === tab.tabId ? classes.newPage : navElementClassName
      )}
      onClick={onClick}
      onBlur={onBlur}
      type='button'
    >
      {tab.icon}
      <Paragraph size='small' short className={classes.buttonText}>
        {tab.tabName}
      </Paragraph>
    </button>
  );
};
