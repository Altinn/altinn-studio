import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExpandablePolicyElementProps } from './ExpandablePolicyElement';
import { ExpandablePolicyElement } from './ExpandablePolicyElement';
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

    await waitFor(() => user.click(expandButtonClosedBefore));

    const expandButtonClosedAfter = screen.queryByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_close_icon')}`,
    });
    const expandButtonOpenedAfter = await screen.findByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_open_icon')}`,
    });

    expect(screen.queryByText(mockTextChildren)).not.toBeInTheDocument();
    expect(expandButtonClosedAfter).not.toBeInTheDocument();
    expect(expandButtonOpenedAfter).toBeInTheDocument();

    user.click(expandButtonOpenedAfter);

    expect(await screen.findByText(mockTextChildren)).toBeInTheDocument();
  });

  it('calls handleRemoveElement when the "Delete" option in the dropdown menu is clicked', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyElement {...defaultProps} />);

    const moreButton = screen.getByRole('button', {
      name: textMock('policy_editor.more'),
    });
    user.click(moreButton);

    const deleteOption = await screen.findByRole('menuitem', { name: textMock('general.delete') });
    user.click(deleteOption);

    await waitFor(() => expect(mockHandleRemoveElement).toHaveBeenCalledTimes(1));
  });

  it('calls handleCloneElement when the "Copy" option in the dropdown menu is clicked', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyElement {...defaultProps} />);

    const moreButton = screen.getByRole('button', {
      name: textMock('policy_editor.more'),
    });
    user.click(moreButton);

    const cloneOption = await screen.findByRole('menuitem', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    user.click(cloneOption);

    await waitFor(() => expect(mockHandleCloneElement).toHaveBeenCalledTimes(1));
  });
});
