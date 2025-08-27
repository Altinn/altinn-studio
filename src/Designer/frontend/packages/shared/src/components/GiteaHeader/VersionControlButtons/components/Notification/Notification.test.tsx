import React from 'react';
import { render, screen } from '@testing-library/react';
import { Notification, type NotificationProps } from './Notification';

const mockNumChanges: number = 2;

const defaultProps: NotificationProps = {
  numChanges: mockNumChanges,
};

describe('Notification', () => {
  it('should render the number of changes passed as prop', () => {
    render(<Notification {...defaultProps} />);

    expect(screen.getByText(mockNumChanges.toString())).toBeInTheDocument();
  });
});
