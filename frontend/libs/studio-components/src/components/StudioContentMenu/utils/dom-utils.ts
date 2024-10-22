import React from 'react';

export function moveFocus(event: React.KeyboardEvent<HTMLTab>) {
  const nextTab = getNextTab(event);
  if (nextTab) {
    event.preventDefault();
    nextTab.tabIndex = 0;
    nextTab.focus();
    event.currentTarget.tabIndex = -1;
  }
}

function getNextTab({ key, currentTarget }: React.KeyboardEvent<>) {
  const tablist = getParentTablist(currentTarget);
  const tabs = getTabs(tablist);
  switch (key) {
    case 'ArrowUp':
      return getTabElementAbove(tabs, currentTarget);
    case 'ArrowDown':
      return getTabElementBelow(tabs, currentTarget);
    default:
      return null;
  }
}

function getTabElementAbove(tabs, currentTab) {
  const currentIndex = tabs.indexOf(currentTab);

  // If there is a tab above, return it
  if (currentIndex > 0) {
    return tabs[currentIndex - 1] as HTMLElement;
  }

  // If no tab above (i.e., first tab), return null
  return null;
}

function getTabElementBelow(tabs, currentTab) {
  const currentIndex = tabs.indexOf(currentTab);

  // If there is a tab below, return it
  if (currentIndex < tabs.length - 1) {
    return tabs[currentIndex + 1] as HTMLElement;
  }

  // If no tab below (i.e., last tab), return null
  return null;
}

function getTabs(tablist: HTMLElement): HTMLElement[] {
  return Array.from(tablist.querySelectorAll('[role="tab"]')) as HTMLElement[];
}

function getParentTablist(element: HTMLElement): HTMLElement | null {
  return element.closest('[role="tablist"]');
}
