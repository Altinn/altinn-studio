import { render, screen } from '@testing-library/react';

import { DisplayNumber } from './DisplayNumber';

describe('DisplayNumber', () => {
  it('renders the value inside a span', () => {
    render(<DisplayNumber value={12345} />);

    expect(screen.getByText('12345')).toBeInTheDocument();
  });

  it('formats the value using numeric formatting', () => {
    render(<DisplayNumber value={1234567} formatting={{ number: { thousandSeparator: ' ' } }} />);

    expect(screen.getByText('1 234 567')).toBeInTheDocument();
  });

  it('formats the value using pattern formatting', () => {
    render(<DisplayNumber value={12345678} formatting={{ number: { format: '### ## ###' } }} />);

    expect(screen.getByText('123 45 678')).toBeInTheDocument();
  });

  it('renders an icon with alt text when iconUrl is provided', () => {
    render(<DisplayNumber value={12345} iconUrl='/icon.svg' iconAltText='Number icon' />);

    const icon = screen.getByRole('img', { name: 'Number icon' });
    expect(icon).toHaveAttribute('src', '/icon.svg');
  });

  it('omits the icon when iconUrl is not provided', () => {
    render(<DisplayNumber value={12345} iconAltText='unused' />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('associates the value span with labelId via aria-labelledby', () => {
    render(<DisplayNumber value={12345} labelId='number-label' />);

    expect(screen.getByText('12345')).toHaveAttribute('aria-labelledby', 'number-label');
  });
});
