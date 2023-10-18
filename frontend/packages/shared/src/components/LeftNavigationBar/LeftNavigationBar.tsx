import React, { KeyboardEventHandler, ReactNode, useRef, useState } from 'react';
import classes from './LeftNavigationBar.module.css';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
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
 *    />
 *
 * @property {LeftNavigationBar[]}[tabs] - List of navigation tabs
 * @property {'backButton' | undefined}[upperTab] - The upper tab
 * @property {string}[backLink] - Href for the back link
 * @property {string}[backLinkText] - The text on the back link
 * @property {string}[className] - Additional classnames
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
  const [newTabIdClicked, setNewTabIdClicked] = useState<string | null>(null);

  /**
   * Function to be executed when the tab is clicked
   */
  const handleClick = (tabId: string) => {
    const tabClicked = tabs.find((tab: LeftNavigationTab) => tab.tabId === tabId);
    if (tabClicked && !tabClicked.isActiveTab) {
      setNewTabIdClicked(tabId);
      tabClicked.action.onClick(tabId);
    }
  };

  /**
   * Dispalys the uppermost tab if there is one
   * @returns
   */
  const displayUpperTab = () => {
    if (upperTab === 'backButton' && backLink && backLinkText) {
      return (
        <GoBackButton className={classes.navigationElement} to={backLink} text={backLinkText} />
      );
    }
    return null;
  };

  const findTabIndexByValue = (value: string) => tabs.findIndex((tab) => tab.tabId === value);

  const initialTab = selectedTab ?? tabs[0].tabId;

  const tablistRef = useRef<HTMLDivElement>(null);

  const lastIndex = tabs.length - 1;

  const [focusIndex, setFocusIndex] = useState<number>(findTabIndexByValue(initialTab));

  useUpdate(() => {
    tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[focusIndex].focus();
    console.log(
      'tablistRef.current',
      tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[focusIndex],
    );
  }, [focusIndex]);

  const selectTab = (value: string) => {
    selectedTab !== value && handleClick(value);
    setFocusIndex(findTabIndexByValue(value));
  };

  // TODO - REPLACE RIGHT AND LEFT WITH UP AND DOWN
  const moveFocusRight = () => {
    console.log('focusIndex', focusIndex);
    console.log('lastIndex', lastIndex);
    focusIndex !== undefined && setFocusIndex(focusIndex === lastIndex ? 0 : focusIndex + 1);
  };

  const moveFocusLeft = () =>
    focusIndex !== undefined && setFocusIndex(focusIndex === 0 ? lastIndex : focusIndex - 1);

  const onKeyDown = (name: string) => (event: Parameters<KeyboardEventHandler>[0]) => {
    console.log('event.key', event.key);
    switch (event.key) {
      case 'ArrowRight':
        console.log('in arrow right');
        moveFocusRight();
        break;
      case 'ArrowLeft':
        console.log('in arrow left');
        moveFocusLeft();
        break;
      case 'Space':
        console.log('in space');
        selectTab(name);
    }
  };

  /**
   * Displays all the tabs
   */
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
