import React from 'react';
import type { StudioReferenceButtonProps } from './StudioReferenceButton';
import { StudioReferenceButton } from './StudioReferenceButton';
import { render, screen } from '@testing-library/react';

// Test data:
const name = 'Test';

describe('StudioReferenceButton', () => {
  it('Renders a button', () => {
    renderButton();
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });
});

const renderButton = (props: Partial<StudioReferenceButtonProps> = {}) => {
  render(<StudioReferenceButton name={name} onClick={() => {}} node={undefined} {...props} />);
};
