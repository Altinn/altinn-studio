import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  ActionAndSubjectListItem,
  ActionAndSubjectListItemProps,
} from './ActionAndSubjectListItem';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

const mockChipTitle: string = 'Test';

describe('ActionAndSubjectListItem', () => {
  const mockOnRemove = jest.fn();

  const defaultProps: ActionAndSubjectListItemProps = {
    title: mockChipTitle,
    onRemove: mockOnRemove,
  };

  it('calls the onRemove function when the chip is clicked', async () => {
    const user = userEvent.setup();
    render(<ActionAndSubjectListItem {...defaultProps} />);

    const chipElement = screen.getByText(mockChipTitle);
    await act(() => user.click(chipElement));

    expect(mockOnRemove).toHaveBeenCalled();
  });
});
