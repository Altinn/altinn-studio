import { render, screen } from '@testing-library/react';
import { FixedWidthDecorator } from './FixedWidthDecorator';

describe('FixedWidthDecorator', () => {
  it('Renders content', () => {
    const content = 'content';
    render(<FixedWidthDecorator>{content}</FixedWidthDecorator>);
    expect(screen.getByText(content)).toBeInTheDocument();
  });
});
