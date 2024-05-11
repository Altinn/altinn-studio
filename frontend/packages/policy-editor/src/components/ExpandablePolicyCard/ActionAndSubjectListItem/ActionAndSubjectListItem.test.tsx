import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { ActionAndSubjectListItemProps } from './ActionAndSubjectListItem';
import { ActionAndSubjectListItem } from './ActionAndSubjectListItem';
import userEvent from '@testing-library/user-event';

const mockChipTitle: string = 'Test';

describe('ActionAndSubjectListItem', () => {
  afterEach(jest.clearAllMocks);

  const mockOnRemove = jest.fn();

  const defaultProps: ActionAndSubjectListItemProps = {
    title: mockChipTitle,
    onRemove: mockOnRemove,
  };

  it('calls the onRemove function when the chip is clicked', async () => {
    const user = userEvent.setup();
    render(<ActionAndSubjectListItem {...defaultProps} />);

    const chipElement = screen.getByText(mockChipTitle);
    user.click(chipElement);

    await waitFor(() => expect(mockOnRemove).toHaveBeenCalledTimes(1));
  });
});
