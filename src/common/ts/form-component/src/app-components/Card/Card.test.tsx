import { render, screen } from '@testing-library/react';

import { AppCard } from './Card';

describe('AppCard', () => {
  it('Renders AppCard with standard values correctly', () => {
    render(<AppCard title='Card title' description='Card description' footer='Card footer' />);

    expect(screen.getByRole('heading', { name: 'Card title' })).toBeInTheDocument();
    expect(screen.getByText('Card description')).toBeInTheDocument();
    expect(screen.getByText('Card footer')).toBeInTheDocument();
  });
});
