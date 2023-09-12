import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { act } from 'react-dom/test-utils';
import { TestFlaskIcon } from '@navikt/aksel-icons';
import { Tab, TabProps } from './Tab';

const mockOnClick = jest.fn();

const mockTab: LeftNavigationTab = {
  icon: <TestFlaskIcon />,
  tabName: 'Tab 1',
  tabId: 0,
  onClick: mockOnClick,
  isActiveTab: true,
};

describe('Tab', () => {
  afterEach(jest.clearAllMocks);

  const mockOnBlur = jest.fn();

  const defaultProps: TabProps = {
    tab: mockTab,
    navElementClassName: '.navigationElement',
    onBlur: mockOnBlur,
    onClick: mockOnClick,
    newTabIdClicked: 1,
  };

  it('calls the onClick function when the tab is clicked', async () => {
    const user = userEvent.setup();
    render(<Tab {...defaultProps} />);

    const tabButton = screen.getByRole('button', { name: mockTab.tabName });
    await act(() => user.click(tabButton));

    expect(mockTab.onClick).toHaveBeenCalledTimes(1);
  });

  it('calls the onBlur function when the tab is blurred', async () => {
    const user = userEvent.setup();
    render(<Tab {...defaultProps} />);

    const tabButton = screen.getByRole('button', { name: mockTab.tabName });
    await act(() => user.click(tabButton));
    await act(() => user.tab());

    expect(mockOnBlur).toHaveBeenCalledTimes(1);
  });
});
