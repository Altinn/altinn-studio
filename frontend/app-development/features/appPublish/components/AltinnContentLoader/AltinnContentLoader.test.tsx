import React from 'react';
import { render, screen } from '@testing-library/react';
import { AltinnContentLoader } from './AltinnContentLoader';

describe('AltinnContentLoader', () => {
  it('should render with default height and width', () => {
    render(<AltinnContentLoader />);

    const loader = screen.getByRole('img', { hidden: true });
    expect(loader).toHaveAttribute('height', '200');
    expect(loader).toHaveAttribute('width', '400');
  });

  it('should render with custom height and width', () => {
    render(<AltinnContentLoader height={300} width={500} />);

    const loader = screen.getByRole('img', { hidden: true });
    expect(loader).toHaveAttribute('height', '300');
    expect(loader).toHaveAttribute('width', '500');
  });

  it('should render children', () => {
    render(
      <AltinnContentLoader>
        <rect x='0' y='0' width='100' height='100' />
      </AltinnContentLoader>,
    );
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
