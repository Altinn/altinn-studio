import { render, screen } from '@testing-library/react';

import { ParagraphText } from './ParagraphText';

describe('ParagraphText', () => {
  it('renders inline (span) content as a single <p>', () => {
    const { container } = render(
      <ParagraphText>
        <span>inline content</span>
      </ParagraphText>,
    );
    expect(container.children).toHaveLength(1);
    expect(container.children[0].tagName).toEqual('P');
  });

  it('wraps non-inline content in a <div> to avoid invalid <p> nesting', () => {
    const { container } = render(
      <ParagraphText>
        <h3>Heading</h3>
      </ParagraphText>,
    );
    const rendered = container.firstElementChild;
    expect(rendered?.tagName).toEqual('DIV');
    expect(rendered?.children[0].tagName).toEqual('H3');
  });

  it('renders a plain string inline as a <p>', () => {
    const { container } = render(<ParagraphText>plain string</ParagraphText>);
    expect(container.children).toHaveLength(1);
    expect(container.children[0].tagName).toEqual('P');
    expect(screen.getByText('plain string')).toBeInTheDocument();
  });
});
