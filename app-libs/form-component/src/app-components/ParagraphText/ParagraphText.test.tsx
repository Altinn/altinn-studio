import { render, screen } from '@testing-library/react';

import { ParagraphText } from './ParagraphText';

describe('ParagraphText', () => {
  it('renders inline (span) content as a single <p>', () => {
    render(
      <div data-testid='wrap'>
        <ParagraphText>
          <span>inline content</span>
        </ParagraphText>
      </div>,
    );
    const wrap = screen.getByTestId('wrap');
    expect(wrap.children).toHaveLength(1);
    expect(wrap.children[0].tagName).toEqual('P');
  });

  it('wraps non-inline content in a <div> to avoid invalid <p> nesting', () => {
    render(
      <div data-testid='wrap'>
        <ParagraphText>
          <h3>Heading</h3>
        </ParagraphText>
      </div>,
    );
    const rendered = screen.getByTestId('wrap').firstElementChild;
    expect(rendered?.tagName).toEqual('DIV');
    expect(rendered?.children[0].tagName).toEqual('H3');
  });

  it('renders a plain string as block content (div wrapper)', () => {
    render(
      <div data-testid='wrap'>
        <ParagraphText>plain string</ParagraphText>
      </div>,
    );
    const rendered = screen.getByTestId('wrap').firstElementChild;
    expect(rendered?.tagName).toEqual('DIV');
    expect(screen.getByText('plain string')).toBeInTheDocument();
  });
});
