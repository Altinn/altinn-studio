import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TimeRangeSelect, type TimeRangeSelectProps } from './TimeRangeSelect';
import userEvent from '@testing-library/user-event';

const defaultProps: TimeRangeSelectProps = {
  label: 'Time Range',
  value: 5,
  onChange: jest.fn(),
};

describe('TimeRangeSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render component', () => {
    renderTimeRangeSelect();

    expect(screen.getByLabelText(defaultProps.label)).toBeInTheDocument();
  });

  it('should change range when selecting a new range', async () => {
    const user = userEvent.setup();

    renderTimeRangeSelect();

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '60');

    await waitFor(() => {
      expect(defaultProps.onChange).toHaveBeenCalledWith(60);
    });
  });
});

const renderTimeRangeSelect = (props: TimeRangeSelectProps = defaultProps) => {
  render(<TimeRangeSelect {...props} />);
};
