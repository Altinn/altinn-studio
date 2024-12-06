import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioDisplayTile, type StudioDisplayTileProps } from './StudioDisplayTile';

const padlockIconTestId: string = 'padlockIconTestId';

const defaultProps: StudioDisplayTileProps = {
  label: 'Label',
  value: 'value',
};

describe('StudioDisplayTile', () => {
  it('should show the padlock icon when showPadlock is true', () => {
    render(<StudioDisplayTile {...defaultProps} showPadlock />);
    expect(screen.getByTestId(padlockIconTestId)).toBeInTheDocument();
  });

  it('should hide the padlock icon when showPadlock is false', () => {
    render(<StudioDisplayTile {...defaultProps} showPadlock={false} />);
    expect(screen.queryByTestId(padlockIconTestId)).not.toBeInTheDocument();
  });
});
