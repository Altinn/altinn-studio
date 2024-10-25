import type React from 'react';

export function moveFocus(event: React.KeyboardEvent<HTMLDivElement>) {
  const nextTab = getNextTab(event);
  if (nextTab) {
    event.preventDefault();
    nextTab.tabIndex = 0;
    nextTab.focus();
    event.currentTarget.tabIndex = -1;
  }
}

function getNextTab({ key, currentTarget }: React.KeyboardEvent<HTMLDivElement>) {
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

function getTabElementAbove(tabs: HTMLDivElement[], currentTab: HTMLDivElement) {
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex > 0) {
    return tabs[currentIndex - 1] as HTMLTabElement;
  }
  return null;
}

function getTabElementBelow(tabs: HTMLDivElement[], currentTab: HTMLDivElement) {
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex < tabs.length - 1) {
    return tabs[currentIndex + 1] as HTMLDivElement;
  }
  return null;
}

function getTabs(tablist: HTMLDivElement): HTMLDivElement[] {
  return Array.from(tablist.querySelectorAll('[role="tab"]')) as HTMLDivElement[];
}

function getParentTablist(element: HTMLDivElement): HTMLDivElement | null {
  return element.closest('[role="tablist"]');
}
