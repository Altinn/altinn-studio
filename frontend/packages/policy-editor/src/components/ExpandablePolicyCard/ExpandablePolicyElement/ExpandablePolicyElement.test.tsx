import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExpandablePolicyElementProps } from './ExpandablePolicyElement';
import { ExpandablePolicyElement } from './ExpandablePolicyElement';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

const mockTitle: string = 'Test';
const mockTextChildren: string = 'Test Content';
const mockChildren: React.ReactNode = <p>{mockTextChildren}</p>;

describe('ExpandablePolicyElement', () => {
  afterEach(jest.clearAllMocks);

  const mockHandleRemoveElement = jest.fn();
  const mockHandleCloneElement = jest.fn();

  const defaultProps: ExpandablePolicyElementProps = {
    title: mockTitle,
    handleRemoveElement: mockHandleRemoveElement,
    handleCloneElement: mockHandleCloneElement,
    children: mockChildren,
  };

  it('renders the component with the provided title and children', () => {
    render(<ExpandablePolicyElement {...defaultProps} />);

    const expandButton = screen.getByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_close_icon')}`,
    });
    expect(expandButton).toBeInTheDocument();

    const contentElement = screen.getByText(mockTextChildren);
    expect(contentElement).toBeInTheDocument();
  });

  it('toggles open/close state when the expand button is clicked', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyElement {...defaultProps} />);

    const expandButtonClosedBefore = screen.getByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_close_icon')}`,
    });
    const expandButtonOpenedBefore = screen.queryByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_open_icon')}`,
    });

    expect(screen.getByText(mockTextChildren)).toBeInTheDocument();
    expect(expandButtonClosedBefore).toBeInTheDocument();
    expect(expandButtonOpenedBefore).not.toBeInTheDocument();

    await act(() => user.click(expandButtonClosedBefore));

    const expandButtonClosedAfter = screen.queryByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_close_icon')}`,
    });
    const expandButtonOpenedAfter = screen.getByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_open_icon')}`,
    });

    expect(screen.queryByText(mockTextChildren)).not.toBeInTheDocument();
    expect(expandButtonClosedAfter).not.toBeInTheDocument();
    expect(expandButtonOpenedAfter).toBeInTheDocument();

    await act(() => user.click(expandButtonOpenedAfter));

    expect(screen.getByText(mockTextChildren)).toBeInTheDocument();
  });

  it('calls handleRemoveElement when the "Delete" option in the dropdown menu is clicked', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyElement {...defaultProps} />);

    const moreButton = screen.getByRole('button', {
      name: textMock('policy_editor.more'),
    });
    await act(() => user.click(moreButton));

    const deleteOption = screen.getByRole('menuitem', { name: textMock('general.delete') });
    await act(() => user.click(deleteOption));

    expect(mockHandleRemoveElement).toHaveBeenCalledTimes(1);
  });

  it('calls handleCloneElement when the "Copy" option in the dropdown menu is clicked', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyElement {...defaultProps} />);

    const moreButton = screen.getByRole('button', {
      name: textMock('policy_editor.more'),
    });
    await act(() => user.click(moreButton));

    const cloneOption = screen.getByRole('menuitem', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    await act(() => user.click(cloneOption));

    expect(mockHandleCloneElement).toHaveBeenCalledTimes(1);
  });
});
