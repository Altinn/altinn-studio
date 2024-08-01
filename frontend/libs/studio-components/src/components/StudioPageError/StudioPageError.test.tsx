import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioPageError } from './StudioPageError';

const title: string = 'title';
const message: string = 'message';

describe('StudioPageError', () => {
  it('Renders correctly', () => {
    render(<StudioPageError title={title} message={message} />);

    const heading = screen.getByRole('heading', {
      name: title,
      level: 1,
    });
    expect(heading).toBeInTheDocument();

    const paragraph = screen.getByText(message);
    expect(paragraph).toBeInTheDocument();
  });
});
