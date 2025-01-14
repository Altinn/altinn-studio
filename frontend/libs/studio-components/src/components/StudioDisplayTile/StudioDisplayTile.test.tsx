import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioDisplayTile, type StudioDisplayTileProps } from './StudioDisplayTile';

const padlockIconTestId: string = 'padlockIconTestId';

const label = 'label';
const value = 'value';
const defaultProps: StudioDisplayTileProps = {
  label,
  value,
};

describe('StudioDisplayTile', () => {
  it('should render displayTile', () => {
    render(<StudioDisplayTile {...defaultProps} />);
    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it('should render displayTile with value', () => {
    render(<StudioDisplayTile {...defaultProps} />);
    expect(screen.getByText(value)).toBeInTheDocument();
  });

  it('should show the padlock icon when by default', () => {
    render(<StudioDisplayTile {...defaultProps} />);
    expect(screen.getByTestId(padlockIconTestId)).toBeInTheDocument();
  });

  it('should show the padlock icon when showPadlock is true', () => {
    render(<StudioDisplayTile {...defaultProps} showPadlock />);
    expect(screen.getByTestId(padlockIconTestId)).toBeInTheDocument();
  });

  it('should hide the padlock icon when showPadlock is false', () => {
    render(<StudioDisplayTile {...defaultProps} showPadlock={false} />);
    expect(screen.queryByTestId(padlockIconTestId)).not.toBeInTheDocument();
  });

  it('should not assign prefix icon className by default', () => {
    render(<StudioDisplayTile {...defaultProps} />);
    expect(screen.getByLabelText(label)).not.toHaveClass('prefixIcon');
  });

  it('should assign prefix icon className when prefix icon is set', () => {
    render(<StudioDisplayTile {...defaultProps} icon={<svg />} />);
    expect(screen.getByLabelText(label)).toHaveClass('prefixIcon');
  });
});
