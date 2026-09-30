import { render, screen } from '@testing-library/react';

import { DisplayDate } from './DisplayDate';

describe('DisplayDate', () => {
  it('renders the value inside a span', () => {
    render(<DisplayDate value='15.03.2025' />);

    expect(screen.getByText('15.03.2025')).toBeInTheDocument();
  });

  it('renders an icon with alt text when iconUrl is provided', () => {
    render(<DisplayDate value='15.03.2025' iconUrl='/icon.svg' iconAltText='Calendar icon' />);

    const icon = screen.getByRole('img', { name: 'Calendar icon' });
    expect(icon).toHaveAttribute('src', '/icon.svg');
  });

  it('omits the icon when iconUrl is not provided', () => {
    render(<DisplayDate value='15.03.2025' iconAltText='unused' />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('associates the value span with labelId via aria-labelledby', () => {
    render(<DisplayDate value='15.03.2025' labelId='date-label' />);

    expect(screen.getByText('15.03.2025')).toHaveAttribute('aria-labelledby', 'date-label');
  });
});
