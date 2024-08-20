import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioError } from './StudioError';

const message: string = 'message';

describe('StudioError', () => {
  it('Should render component correctly', () => {
    render(<StudioError>{message}</StudioError>);

    const paragraph = screen.getByText(message);
    expect(paragraph).toBeInTheDocument();
  });

  it('should support children as ReactNode', () => {
    render(
      <StudioError>
        <a href='https://unit-tests.altinn'>ReactNode Message</a>
      </StudioError>,
    );

    const messageAsLink = screen.getByRole('link', { name: 'ReactNode Message' });
    expect(messageAsLink).toBeInTheDocument();
  });
});
