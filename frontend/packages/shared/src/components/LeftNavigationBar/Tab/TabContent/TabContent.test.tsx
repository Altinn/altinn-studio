import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import type { TabContentProps } from './TabContent';
import { TabContent } from './TabContent';
import type { TabAction } from 'app-shared/types/LeftNavigationTab';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockOnClick = jest.fn();
const mockOnBlur = jest.fn();
const mockOnKeyDown = jest.fn();

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

const mockTabName: string = 'Tab 1';

describe('TabWrapper', () => {
  afterEach(jest.clearAllMocks);

  const defaultProps: TabContentProps = {
    className: '.navElement',
    onBlur: mockOnBlur,
    onClick: mockOnClick,
    action: mockLinkAction,
    children: <p>{mockTabName}</p>,
    tabIndex: 0,
    onKeyDown: mockOnKeyDown,
  };

  it('renders a link wrapper when action type is link', () => {
    render(defaultProps);

    const linkWrapper = screen.getByRole('tab', { name: mockTabName });
    expect(linkWrapper).toBeInTheDocument();
    expect(linkWrapper).toHaveAttribute('href', mockLinkAction.to);
  });

  it('calls onClick when onClick is present and type is link', async () => {
    const user = userEvent.setup();
    render(defaultProps);

    const linkWrapper = screen.getByRole('tab', { name: mockTabName });

    await act(() => user.click(linkWrapper));
    expect(mockLinkAction.onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when onClick is not present and type is link', async () => {
    const user = userEvent.setup();
    render({ ...defaultProps, action: mockLinkAction2 });

    const linkWrapper = screen.getByRole('tab', { name: mockTabName });

    await act(() => user.click(linkWrapper));
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('renders a button wrapper when action type is button', () => {
    render({ ...defaultProps, action: mockButtonAction });

    const buttonWrapper = screen.getByRole('tab', { name: mockTabName });
    expect(buttonWrapper).toBeInTheDocument();
  });

  it('executes the onClick handler when button wrapper is clicked', async () => {
    const user = userEvent.setup();
    render({ ...defaultProps, action: mockButtonAction });

    const buttonWrapper = screen.getByRole('tab', { name: mockTabName });
    await act(() => user.click(buttonWrapper));
    expect(mockButtonAction.onClick).toHaveBeenCalledTimes(1);
  });

  it('calls the "onKeyDown" function when a tab is clicked with keyboard', async () => {
    const user = userEvent.setup();
    render({ ...defaultProps, action: mockButtonAction });

    const buttonWrapper = screen.getByRole('tab', { name: mockTabName });
    await act(() => user.click(buttonWrapper));
    await act(() => user.keyboard('{Tab}'));
    expect(mockOnKeyDown).toHaveBeenCalledTimes(1);
  });

  it('executes the onBlur when the wrapper is tabbed through and type is button', async () => {
    const user = userEvent.setup();
    render({ ...defaultProps, action: mockButtonAction });

    const buttonWrapper = screen.getByRole('tab', { name: mockTabName });
    await act(() => user.click(buttonWrapper));
    await act(() => user.tab());
    expect(mockOnBlur).toHaveBeenCalledTimes(1);
  });

  it('executes the onBlur when the wrapper is tabbed through and type is link', async () => {
    const user = userEvent.setup();
    render({ ...defaultProps });

    const linkWrapper = screen.getByRole('tab', { name: mockTabName });
    await act(() => user.click(linkWrapper));
    await act(() => user.tab());
    expect(mockOnBlur).toHaveBeenCalledTimes(1);
  });
});

const render = (props: TabContentProps) => {
  return rtlRender(
    <MemoryRouter initialEntries={['/']}>
      <TabContent {...props} />
    </MemoryRouter>,
  );
};
