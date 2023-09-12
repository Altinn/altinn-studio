import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeftNavigationBar, LeftNavigationBarProps } from './LeftNavigationBar';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { TestFlaskIcon } from '@navikt/aksel-icons';
import { act } from 'react-dom/test-utils';

const mockOnClick = jest.fn();

const mockTabs: LeftNavigationTab[] = [
  {
    icon: <TestFlaskIcon />,
    tabName: 'Tab 1',
    tabId: 0,
    onClick: mockOnClick,
    isActiveTab: true,
  },
  {
    icon: <TestFlaskIcon />,
    tabName: 'Tab 2',
    tabId: 2,
    onClick: mockOnClick,
    isActiveTab: false,
  },
];

const mockBackButtonText: string = 'Go back';

describe('LeftNavigationBar', () => {
  afterEach(jest.clearAllMocks);

  const mockOnClickUpperTabBackButton = jest.fn();

  const defaultProps: LeftNavigationBarProps = {
    tabs: mockTabs,
    upperTab: 'backButton',
    onClickUpperTabBackButton: mockOnClickUpperTabBackButton,
    backButtonText: mockBackButtonText,
  };

  it('calls the onClick function when a tab is clicked', async () => {
    const user = userEvent.setup();
    render(<LeftNavigationBar {...defaultProps} />);

    const nextTab = mockTabs[1];

    const tab2 = screen.getByRole('button', { name: nextTab.tabName });
    await act(() => user.click(tab2));
    expect(nextTab.onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call the onClick function when the active tab is clicked', async () => {
    const user = userEvent.setup();
    render(<LeftNavigationBar {...defaultProps} />);

    const currentTab = mockTabs[0];

    const tab1 = screen.getByRole('button', { name: currentTab.tabName });
    await act(() => user.click(tab1));
    expect(currentTab.onClick).toHaveBeenCalledTimes(0);
  });

  it('displays back button when "upperTab" is backButton and "onClickUpperTabBackButton" and "backButtonText" is present', async () => {
    const user = userEvent.setup();
    render(<LeftNavigationBar {...defaultProps} />);

    const backButton = screen.getByRole('button', { name: mockBackButtonText });
    expect(backButton).toBeInTheDocument();

    await act(() => user.click(backButton));
    expect(mockOnClickUpperTabBackButton).toHaveBeenCalledTimes(1);
  });

  it('does not display the back button when "upperTab" is backButton and "onClickUpperTabBackButton" or "backButtonText" is not present', () => {
    render(<LeftNavigationBar tabs={mockTabs} />);

    const backButton = screen.queryByRole('button', { name: mockBackButtonText });
    expect(backButton).not.toBeInTheDocument();
  });
});
