import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { TabWrapper, TabWrapperProps } from './TabWrapper';
import { TabAction } from 'app-shared/types/LeftNavigationTab';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockOnClick = jest.fn();

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

  const mockOnBlur = jest.fn();

  const defaultProps: TabWrapperProps = {
    className: '.navElement',
    onBlur: mockOnBlur,
    onClick: mockOnClick,
    action: mockLinkAction,
    children: <p>{mockTabName}</p>,
  };

  it('renders a link wrapper when action type is link', () => {
    render(defaultProps);

    const linkWrapper = screen.getByRole('link', { name: mockTabName });
    expect(linkWrapper).toBeInTheDocument();
    expect(linkWrapper).toHaveAttribute('href', mockLinkAction.to);
  });

  it('calls onClick when onClick is present and type is link', async () => {
    const user = userEvent.setup();
    render(defaultProps);

    const linkWrapper = screen.getByRole('link', { name: mockTabName });

    await act(() => user.click(linkWrapper));
    expect(mockLinkAction.onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when onClick is not present and type is link', async () => {
    const user = userEvent.setup();
    render({ ...defaultProps, action: mockLinkAction2 });

    const linkWrapper = screen.getByRole('link', { name: mockTabName });

    await act(() => user.click(linkWrapper));
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('renders a button wrapper when action type is button', () => {
    render({ ...defaultProps, action: mockButtonAction });

    const buttonWrapper = screen.getByRole('button', { name: mockTabName });
    expect(buttonWrapper).toBeInTheDocument();
  });

  it('executes the onClick handler when button wrapper is clicked', async () => {
    const user = userEvent.setup();
    render({ ...defaultProps, action: mockButtonAction });

    const buttonWrapper = screen.getByRole('button', { name: mockTabName });
    await act(() => user.click(buttonWrapper));
    expect(mockButtonAction.onClick).toHaveBeenCalledTimes(1);
  });
});

const render = (props: TabWrapperProps) => {
  return rtlRender(
    <MemoryRouter initialEntries={['/']}>
      <TabWrapper {...props} />
    </MemoryRouter>
  );
};
