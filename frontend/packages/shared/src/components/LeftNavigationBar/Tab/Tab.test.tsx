import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LeftNavigationTab, TabAction } from 'app-shared/types/LeftNavigationTab';
import { act } from 'react-dom/test-utils';
import { TestFlaskIcon } from '@navikt/aksel-icons';
import type { TabProps } from './Tab';
import { Tab } from './Tab';
import { MemoryRouter } from 'react-router-dom';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

const mockOnClick = jest.fn();
const mockOnKeyDown = jest.fn();
const mockOnBlur = jest.fn();

const mockTo: string = '/test';

const mockLinkAction: TabAction = {
  type: 'link',
  to: mockTo,
  onClick: mockOnClick,
};

const mockLinkAction2: TabAction = {
  type: 'link',
  to: mockTo,
};

const mockButtonAction: TabAction = {
  type: 'button',
  onClick: mockOnClick,
};

const mockTabId1: string = 'tab1';
const mockTabId2: string = 'tab2';

const mockTab1: LeftNavigationTab = {
  icon: <TestFlaskIcon />,
  tabName: `test.test_${mockTabId1}`,
  tabId: mockTabId1,
  action: mockLinkAction,
  isActiveTab: true,
};

const mockTab2: LeftNavigationTab = {
  ...mockTab1,
  action: mockLinkAction2,
};

const mockTab3: LeftNavigationTab = {
  ...mockTab1,
  action: mockButtonAction,
};

describe('Tab', () => {
  afterEach(jest.clearAllMocks);

  const defaultProps: TabProps = {
    tab: mockTab1,
    navElementClassName: '.navigationElement',
    onBlur: mockOnBlur,
    onClick: mockOnClick,
    newTabIdClicked: mockTabId2,
    tabIndex: 0,
    onKeyDown: mockOnKeyDown,
  };

  it('calls the onClick function when onClick is present and type is link', async () => {
    const user = userEvent.setup();
    render(defaultProps);

    const tabLink = screen.getByRole('tab', { name: textMock(mockTab1.tabName) });
    await act(() => user.click(tabLink));

    expect(mockTab1.action.onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call the onClick function when onClick is not present and type is link', async () => {
    const user = userEvent.setup();
    render({ ...defaultProps, tab: mockTab2 });

    const tabLink = screen.getByRole('tab', { name: textMock(mockTab2.tabName) });
    await act(() => user.click(tabLink));

    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('calls the onClick function when type is button', async () => {
    const user = userEvent.setup();
    render({ ...defaultProps, tab: mockTab3 });

    const tabButton = screen.getByRole('tab', { name: textMock(mockTab3.tabName) });
    await act(() => user.click(tabButton));

    expect(mockTab3.action.onClick).toHaveBeenCalledTimes(1);
  });

  it('calls the "onKeyDown" function when a tab is clicked with keyboard', async () => {
    const user = userEvent.setup();
    render({ ...defaultProps, tab: mockTab3 });

    const tabButton = screen.getByRole('tab', { name: textMock(mockTab3.tabName) });
    await act(() => user.click(tabButton));
    await act(() => user.keyboard('{Tab}'));
    expect(mockOnKeyDown).toHaveBeenCalledTimes(1);
  });

  it('calls the onBlur function when the tab is blurred', async () => {
    const user = userEvent.setup();
    render(defaultProps);

    const tabLink = screen.getByRole('tab', { name: textMock(mockTab1.tabName) });
    await act(() => user.click(tabLink));
    await act(() => user.tab());

    expect(mockOnBlur).toHaveBeenCalledTimes(1);
  });
});

const render = (props: TabProps) => {
  return rtlRender(
    <MemoryRouter initialEntries={['/']}>
      <Tab {...props} />
    </MemoryRouter>,
  );
};
