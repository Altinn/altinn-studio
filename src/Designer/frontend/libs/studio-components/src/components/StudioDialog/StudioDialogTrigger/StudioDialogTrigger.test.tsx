import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioDialogTrigger } from './index';
import type { StudioDialogTriggerProps } from './StudioDialogTrigger';

describe('StudioDialogTrigger', () => {
  it('Renders triggerbutton with icon when provided', () => {
    const iconTestId: string = 'Icon';
    renderStudioDialogTrigger({ children: <span data-testid={iconTestId} /> });
    expect(screen.getByTestId(iconTestId)).toBeInTheDocument();
  });
});

const renderStudioDialogTrigger = (props?: Partial<StudioDialogTriggerProps>): RenderResult => {
  return render(<StudioDialogTrigger {...props} />);
};
