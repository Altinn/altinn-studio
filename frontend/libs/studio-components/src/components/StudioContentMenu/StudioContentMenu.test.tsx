import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { StudioContentMenuProps } from './StudioContentMenu';
import { StudioContentMenu } from './StudioContentMenu';
import type { StudioMenuTabType } from './types/StudioMenuTabType';

type StudioMenuTabName = 'tab1' | 'tab2' | 'tab3';

const onChangeTabMock = jest.fn();

const tab1Name = 'My tab';
const tab1Id: StudioMenuTabName = 'tab1';
const tab1: StudioMenuTabType<StudioMenuTabName> = {
  tabName: tab1Name,
  tabId: tab1Id,
  icon: <svg></svg>,
};
const tab2Name = 'My second tab';
const tab2Id: StudioMenuTabName = 'tab2';
const tab2: StudioMenuTabType<StudioMenuTabName> = {
  tabName: tab2Name,
  tabId: tab2Id,
  icon: <svg></svg>,
};

describe('StudioContentMenu', () => {
  afterEach(jest.clearAllMocks);

  it('renders an empty contentMenu when there is no provided tabs', () => {
    renderStudioContentMenu({ contentTabs: [] });
    const emptyMenu = screen.getByRole('tablist');
    expect(emptyMenu).toBeInTheDocument();
  });

  it('renders the title and icon of a given menu tab', () => {
    const iconTitle = 'My icon';
    renderStudioContentMenu({
      contentTabs: [
        {
          ...tab1,
          icon: <svg data-testid={iconTitle}></svg>,
        },
      ],
    });
    const menuTab = screen.getByRole('tab', { name: tab1Name });
    const menuIcon = screen.getByTestId(iconTitle);
    expect(menuTab).toBeInTheDocument();
    expect(menuIcon).toBeInTheDocument();
  });

  it('renders a tab with "to" prop as a link element', () => {
    const link = 'url-link';
    renderStudioContentMenu({
      contentTabs: [
        {
          ...tab1,
          to: link,
        },
      ],
    });
    const menuTab = screen.getByRole('tab', { name: tab1Name });
    const linkTab = screen.getByRole('link', { name: tab1Name });
    expect(menuTab).toBeInTheDocument();
    expect(linkTab).toBeInTheDocument();
    expect(linkTab).toHaveAttribute('href', link);
  });

  it('allows changing focus to next tab using keyboard', async () => {
    const user = userEvent.setup();
    renderStudioContentMenu({
      contentTabs: [tab1, tab2],
    });
    const tab1Element = screen.getByRole('tab', { name: tab1Name });
    await user.click(tab1Element);
    const tab2Element = screen.getByRole('tab', { name: tab2Name });
    expect(tab2Element).not.toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(tab2Element).toHaveFocus();
  });

  it('keeps focus on current tab if pressing keyDown when focus is on last tab in menu', async () => {
    const user = userEvent.setup();
    renderStudioContentMenu({
      contentTabs: [tab1, tab2],
    });
    const tab2Element = screen.getByRole('tab', { name: tab2Name });
    await user.click(tab2Element);
    expect(tab2Element).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(tab2Element).toHaveFocus();
  });

  it('allows changing focus to previous tab using keyboard', async () => {
    const user = userEvent.setup();
    renderStudioContentMenu({
      contentTabs: [tab1, tab2],
    });
    const tab2Element = screen.getByRole('tab', { name: tab2Name });
    await user.click(tab2Element);
    const tab1Element = screen.getByRole('tab', { name: tab1Name });
    expect(tab1Element).not.toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(tab1Element).toHaveFocus();
  });

  it('keeps focus on current tab if pressing keyUp when focus is on first tab in menu', async () => {
    const user = userEvent.setup();
    renderStudioContentMenu({
      contentTabs: [tab1, tab2],
    });
    const tab1Element = screen.getByRole('tab', { name: tab1Name });
    await user.click(tab1Element);
    expect(tab1Element).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(tab1Element).toHaveFocus();
  });

  it('calls onChangeTab when clicking enter on a tab with focus', async () => {
    const user = userEvent.setup();
    renderStudioContentMenu({
      contentTabs: [tab1, tab2],
    });
    const tab1Element = screen.getByRole('tab', { name: tab1Name });
    await user.click(tab1Element);
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onChangeTabMock).toHaveBeenCalledTimes(2);
    expect(onChangeTabMock).toHaveBeenNthCalledWith(1, tab1Id);
    expect(onChangeTabMock).toHaveBeenNthCalledWith(2, tab2Id);
  });

  it('calls onChangeTab when clicking on a menu tab', async () => {
    const user = userEvent.setup();
    renderStudioContentMenu({
      contentTabs: [tab1],
    });
    const menuTab = screen.getByRole('tab', { name: tab1Name });
    await user.click(menuTab);
    expect(onChangeTabMock).toHaveBeenCalledTimes(1);
    expect(onChangeTabMock).toHaveBeenCalledWith(tab1Id);
  });

  it('calls onChangeTab when clicking on a menu tab with link', async () => {
    const link = 'url-link';
    const user = userEvent.setup();
    renderStudioContentMenu({
      contentTabs: [
        {
          ...tab1,
          to: link,
        },
      ],
    });
    const menuTab = screen.getByRole('tab', { name: tab1Name });
    await user.click(menuTab);
    expect(onChangeTabMock).toHaveBeenCalledTimes(1);
    expect(onChangeTabMock).toHaveBeenCalledWith(tab1Id);
  });
});

const renderStudioContentMenu = ({
  contentTabs,
}: Partial<StudioContentMenuProps<StudioMenuTabName>> = {}) => {
  render(
    <StudioContentMenu
      contentTabs={contentTabs}
      selectedTabId={undefined}
      onChangeTab={onChangeTabMock}
    />,
  );
};
