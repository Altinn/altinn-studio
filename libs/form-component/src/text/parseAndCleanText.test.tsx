import { render, screen } from '@testing-library/react';

import { isElement, parseAndCleanText, type ParserReplace } from './parseAndCleanText';

describe('parseAndCleanText', () => {
  it('returns null for non-string input', () => {
    expect(parseAndCleanText(undefined)).toBeNull();
  });

  it('renders markdown headings as design-system headings', () => {
    render(<>{parseAndCleanText('## Hello')}</>);
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument();
  });

  it('renders markdown lists', () => {
    render(<>{parseAndCleanText('- one\n- two')}</>);
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
  });

  it('sanitizes dangerous HTML', () => {
    render(
      <div data-testid='wrapper'>
        {parseAndCleanText('<img src=x onerror="alert(1)" /><script>alert(1)</script>safe')}
      </div>,
    );
    const wrapper = screen.getByTestId('wrapper');
    expect(wrapper.querySelector('script')).toBeNull();
    expect(wrapper.querySelector('img')?.getAttribute('onerror')).toBeNull();
    expect(wrapper).toHaveTextContent('safe');
  });

  it('adds the altinnLink class and external-link attributes to anchors', () => {
    render(<div data-testid='wrapper'>{parseAndCleanText('[external](https://example.com)')}</div>);
    const link = screen.getByRole('link', { name: 'external' });
    expect(link).toHaveClass('altinnLink');
    expect(link).toHaveClass('target-external');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('lets an injected replace override node rendering and fall through otherwise', () => {
    const replace: ParserReplace = (domNode) => {
      if (isElement(domNode) && domNode.name === 'a') {
        return <span data-testid='custom-link'>custom</span>;
      }
    };

    render(<div>{parseAndCleanText('# Heading\n\n[link](https://example.com)', { replace })}</div>);

    // injected replace handled the anchor
    expect(screen.getByTestId('custom-link')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    // built-in handling still applied to the heading
    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument();
  });
});
