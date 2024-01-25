import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ActionAndSubjectListItemProps } from './ActionAndSubjectListItem';
import { ActionAndSubjectListItem } from './ActionAndSubjectListItem';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

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
    await act(() => user.click(chipElement));

    expect(mockOnRemove).toHaveBeenCalledTimes(1);
  });
});
