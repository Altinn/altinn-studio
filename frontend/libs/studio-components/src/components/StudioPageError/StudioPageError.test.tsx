import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioPageError } from './StudioPageError';

const title: string = 'title';
const message: string = 'message';

describe('StudioPageError', () => {
  it('renders correctly', () => {
    render(<StudioPageError title={title} message={message} />);

    const heading = screen.getByRole('heading', {
      name: title,
      level: 2,
    });
    expect(heading).toBeInTheDocument();

    const paragraph = screen.getByText(message);
    expect(paragraph).toBeInTheDocument();
  });
});
