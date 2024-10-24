import type React from 'react';

export function moveFocus(event: React.KeyboardEvent<HTMLElement>) {
  const nextTab = getNextTab(event);
  if (nextTab) {
    event.preventDefault();
    nextTab.tabIndex = 0;
    nextTab.focus();
    event.currentTarget.tabIndex = -1;
  }
}

function getNextTab({ key, currentTarget }: React.KeyboardEvent<HTMLElement>) {
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

function getTabElementAbove(tabs: HTMLElement[], currentTab: HTMLElement) {
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex > 0) {
    return tabs[currentIndex - 1] as HTMLElement;
  }
  return null;
}

function getTabElementBelow(tabs: HTMLElement[], currentTab: HTMLElement) {
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex < tabs.length - 1) {
    return tabs[currentIndex + 1] as HTMLElement;
  }
  return null;
}

function getTabs(tablist: HTMLElement): HTMLElement[] {
  return Array.from(tablist.querySelectorAll('[role="tab"]')) as HTMLElement[];
}

function getParentTablist(element: HTMLElement): HTMLElement | null {
  return element.closest('[role="tablist"]');
}
