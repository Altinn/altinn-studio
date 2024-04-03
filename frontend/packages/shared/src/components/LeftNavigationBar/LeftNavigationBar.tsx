import type { ReactNode } from 'react';
import React, { useRef, useState } from 'react';
import classes from './LeftNavigationBar.module.css';
import type { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { GoBackButton } from './GoBackButton';
import { Tab } from './Tab';
import cn from 'classnames';
import { useUpdate } from 'app-shared/hooks/useUpdate';

export type LeftNavigationBarProps = {
  tabs: LeftNavigationTab[];
  upperTab?: 'backButton' | undefined;
  backLink?: string;
  backLinkText?: string;
  className?: string;
  selectedTab: string;
};

/**
 * @component
 *    Displays a navigation bar component to the left of the parent component.
 *
 * @example
 *    <LeftNavigationBar
 *        tabs={listOfTabsOfTypeLeftNavigationTab}
 *        upperTab='backButton'
 *        backLink='./someUrl'
 *        backLinkText={t('resourceadm.left_nav_bar_back')}
 *        selectedTab={selectedTab}
 *    />
 *
 * @property {LeftNavigationBar[]}[tabs] - List of navigation tabs
 * @property {'backButton' | undefined}[upperTab] - The upper tab
 * @property {string}[backLink] - Href for the back link
 * @property {string}[backLinkText] - The text on the back link
 * @property {string}[className] - Additional classnames
 * @property {string}[selectedTab] - The currently selected tab
 *
 * @returns {ReactNode} - The rendered component
 */
export const LeftNavigationBar = ({
  tabs,
  upperTab = undefined,
  backLink,
  backLinkText = '',
  className,
  selectedTab,
}: LeftNavigationBarProps): ReactNode => {
  const tablistRef = useRef<HTMLDivElement>(null);

  const initialTab = selectedTab ?? tabs[0].tabId;
  const lastIndex = tabs.length - 1;

  const findTabIndexByValue = (value: string) => tabs.findIndex((tab) => tab.tabId === value);
  const [focusIndex, setFocusIndex] = useState<number>(findTabIndexByValue(initialTab));

  const [newTabIdClicked, setNewTabIdClicked] = useState<string | null>(null);

  useUpdate(() => {
    tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[focusIndex].focus();
  }, [focusIndex]);

  const handleClick = (tabId: string) => {
    const tabClicked = tabs.find((tab: LeftNavigationTab) => tab.tabId === tabId);
    if (tabClicked && !tabClicked.isActiveTab) {
      setNewTabIdClicked(tabId);
      tabClicked.action.onClick(tabId);
    }
  };

  const displayUpperTab = () => {
    if (upperTab === 'backButton' && backLink && backLinkText) {
      return (
        <GoBackButton className={classes.navigationElement} to={backLink} text={backLinkText} />
      );
    }
    return null;
  };

  const moveFocusDown = () => setFocusIndex(focusIndex === lastIndex ? 0 : focusIndex + 1);

  const moveFocusUp = () => setFocusIndex(focusIndex === 0 ? lastIndex : focusIndex - 1);

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveFocusDown();
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocusUp();
        break;
    }
  };

  const displayTabs = tabs.map((tab: LeftNavigationTab, i: number) => (
    <Tab
      tab={tab}
      onClick={() => handleClick(tab.tabId)}
      key={tab.tabId}
      navElementClassName={cn(classes.navigationElement)}
      onBlur={() => setNewTabIdClicked(null)}
      newTabIdClicked={newTabIdClicked}
      tabIndex={focusIndex === i ? 0 : -1}
      onKeyDown={onKeyDown}
    />
  ));

  return (
    <div className={cn(classes.navigationBar, className)}>
      <div className={classes.navigationElements} role='tablist' ref={tablistRef}>
        {displayUpperTab()}
        {displayTabs}
      </div>
    </div>
  );
};
