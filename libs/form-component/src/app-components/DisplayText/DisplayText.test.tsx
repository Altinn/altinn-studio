import { render, screen } from '@testing-library/react';

import { DisplayText } from './DisplayText';

describe('DisplayText', () => {
  it('renders the value inside a span', () => {
    render(<DisplayText value='Hello world' />);

    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders an icon with alt text when iconUrl is provided', () => {
    render(<DisplayText value='Hello world' iconUrl='/icon.svg' iconAltText='Info icon' />);

    const icon = screen.getByRole('img', { name: 'Info icon' });
    expect(icon).toHaveAttribute('src', '/icon.svg');
  });

  it('omits the icon when iconUrl is not provided', () => {
    render(<DisplayText value='Hello world' iconAltText='unused' />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('associates the value span with labelId via aria-labelledby', () => {
    render(<DisplayText value='Hello world' labelId='text-label' />);

    expect(screen.getByText('Hello world')).toHaveAttribute('aria-labelledby', 'text-label');
  });
});
