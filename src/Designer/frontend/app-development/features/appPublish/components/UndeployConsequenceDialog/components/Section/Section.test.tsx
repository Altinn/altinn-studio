import React from 'react';
import { render, screen } from '@testing-library/react';
import { Section } from './Section';

describe('Section Component', () => {
  test('renders the title and children correctly', () => {
    const title = 'Test Section';
    const children = <li>Item 1</li>;

    render(<Section title={title}>{children}</Section>);

    expect(screen.getByRole('heading', { name: title, level: 3 })).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    const unorderedList = screen.getByRole('list');
    expect(unorderedList).toBeInTheDocument();
  });
});
