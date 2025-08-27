import { render, screen } from '@testing-library/react';
import { PageLoading } from './PageLoading';
import React from 'react';

describe('PageLoading', () => {
  it('should display accessible spinner with title', () => {
    render(<PageLoading title='Loading' />);
    expect(screen.getByTitle('Loading')).toBeInTheDocument();
  });
});
