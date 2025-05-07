import type React from 'react';

export type HTMLTabElement = HTMLAnchorElement | HTMLButtonElement;

export function moveFocus(event: React.KeyboardEvent<HTMLTabElement>): void {
  const nextTab = getNextTab(event);
  if (nextTab) {
    event.preventDefault();
    nextTab.tabIndex = 0;
    nextTab.focus();
    event.currentTarget.tabIndex = -1;
  }
}

function getNextTab({
  key,
  currentTarget,
}: React.KeyboardEvent<HTMLTabElement>): HTMLTabElement | null {
  const tablist: HTMLDivElement | null = getParentTablist(currentTarget);
  const tabs: HTMLTabElement[] | null = getTabs(tablist);
  switch (key) {
    case 'ArrowUp':
      return getTabElementAbove(tabs, currentTarget);
    case 'ArrowDown':
      return getTabElementBelow(tabs, currentTarget);
    default:
      return null;
  }
}

function getTabElementAbove(
  tabs: HTMLTabElement[],
  currentTab: HTMLTabElement,
): HTMLTabElement | null {
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex > 0) {
    return tabs[currentIndex - 1];
  }
  return null;
}

function getTabElementBelow(
  tabs: HTMLTabElement[],
  currentTab: HTMLTabElement,
): HTMLTabElement | null {
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex < tabs.length - 1) {
    return tabs[currentIndex + 1] as HTMLTabElement;
  }
  return null;
}

function getTabs(tablist: HTMLDivElement | null): HTMLTabElement[] {
  if (!tablist) {
    return [];
  }
  return Array.from(tablist.querySelectorAll('[role="tab"]')) as HTMLTabElement[];
}

function getParentTablist(element: HTMLTabElement): HTMLDivElement | null {
  return element.closest('[role="tablist"]');
}
