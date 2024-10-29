import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { StudioContentMenu } from './';
import type { StudioContentMenuWrapperProps } from './StudioContentMenuWrapper';
import type { StudioContentMenuButtonTabProps } from './StudioContentMenuButtonTab';

type StudioMenuTabName = 'tab1' | 'tab2' | 'tab3';

const onChangeTabMock = jest.fn();

const tab1Name = 'My tab';
const tab1Id: StudioMenuTabName = 'tab1';
const tab1: StudioContentMenuButtonTabProps<StudioMenuTabName> = {
  tabName: tab1Name,
  tabId: tab1Id,
  icon: <svg />,
};
const tab2Name = 'My second tab';
const tab2Id: StudioMenuTabName = 'tab2';
const tab2: StudioContentMenuButtonTabProps<StudioMenuTabName> = {
  tabName: tab2Name,
  tabId: tab2Id,
  icon: <svg />,
};

describe('StudioContentMenu', () => {
  afterEach(jest.clearAllMocks);

  it('renders an empty contentMenu when there is no provided tabs', () => {
    renderStudioContentMenu({ buttonTabs: [] });
    const emptyMenu = screen.getByRole('tablist');
    expect(emptyMenu).toBeInTheDocument();
  });

  it('renders the title and icon of a given menu tab', () => {
    const iconTitle = 'My icon';
    renderStudioContentMenu({
      buttonTabs: [
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
      linkTabs: [
        {
          ...tab1,
          to: link,
          renderTab: (children) => <a href={link}>{children}</a>,
        },
      ],
    });
    const linkTab = screen.getByRole('tab', { name: tab1Name });
    expect(linkTab).toBeInTheDocument();
    expect(linkTab).toHaveAttribute('href', link);
  });

  it('allows changing focus to next tab using keyboard', async () => {
    const user = userEvent.setup();
    renderStudioContentMenu({
      buttonTabs: [tab1, tab2],
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
      buttonTabs: [tab1, tab2],
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
      buttonTabs: [tab1, tab2],
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
      buttonTabs: [tab1, tab2],
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
      buttonTabs: [tab1, tab2],
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
      buttonTabs: [tab1],
    });
    const menuTab = screen.getByRole('tab', { name: tab1Name });
    await user.click(menuTab);
    expect(onChangeTabMock).toHaveBeenCalledTimes(1);
    expect(onChangeTabMock).toHaveBeenCalledWith(tab1Id);
  });
});

const renderStudioContentMenu = ({
  buttonTabs = [],
  linkTabs = [],
}: Partial<StudioContentMenuWrapperProps<StudioMenuTabName>> = {}) => {
  render(
    <StudioContentMenu selectedTabId={undefined} onChangeTab={onChangeTabMock}>
      {buttonTabs.map((buttonTab) => (
        <StudioContentMenu.ButtonTab
          key={buttonTab.tabId}
          icon={buttonTab.icon}
          tabId={buttonTab.tabId}
          tabName={buttonTab.tabName}
        />
      ))}
      {linkTabs.map((linkTab) => (
        <StudioContentMenu.LinkTab
          key={linkTab.tabId}
          icon={linkTab.icon}
          tabId={linkTab.tabId}
          tabName={linkTab.tabName}
          to={linkTab.to}
          renderTab={linkTab.renderTab}
        />
      ))}
    </StudioContentMenu>,
  );
};
