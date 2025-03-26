import { render, screen } from '@testing-library/react';
import { Decorator } from './Decorator';
import React from 'react';

describe('Decorator', () => {
  it('Renders content', () => {
    const content = 'content';
    render(<Decorator>{content}</Decorator>);
    expect(screen.getByText(content)).toBeInTheDocument();
  });
});
