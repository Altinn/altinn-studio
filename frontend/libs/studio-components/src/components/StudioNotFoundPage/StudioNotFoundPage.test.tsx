import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioNotFoundPage } from './StudioNotFoundPage';

const title: string = 'title';
const body: string = 'body';
const redirectHref: string = '/';
const redirectLinkText: string = 'text';

describe('StudioNotFoundPage', () => {
  it('renders correctly', () => {
    render(
      <StudioNotFoundPage
        title={title}
        body={body}
        redirectHref={redirectHref}
        redirectLinkText={redirectLinkText}
      />,
    );

    const heading = screen.getByRole('heading', {
      name: title,
      level: 1,
    });
    expect(heading).toBeInTheDocument();

    const paragraph = screen.getByText(body);
    expect(paragraph).toBeInTheDocument();

    const link = screen.getByRole('link', {
      name: redirectLinkText,
    });
    expect(link).toBeInTheDocument();

    const image = screen.getByTestId('404-error');
    expect(image).toBeInTheDocument();

    expect(image.tagName).toBe('IMG');
  });
});
