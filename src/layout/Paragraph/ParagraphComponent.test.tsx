import React from 'react';

import { render as rtlRender, screen } from '@testing-library/react';

import { ParagraphComponent } from 'src/layout/Paragraph/ParagraphComponent';
import type { IParagraphProps } from 'src/layout/Paragraph/ParagraphComponent';

describe('ParagraphComponent', () => {
  it('should render with supplied text', () => {
    const textContent = 'paragraph text content';
    render({
      textResourceBindings: {
        title: textContent,
      },
    });

    expect(screen.getByText(textContent)).toBeInTheDocument();
  });

  it('should render help text if help text is supplied', () => {
    render({
      textResourceBindings: { help: 'this is the help text' },
    });

    expect(
      screen.getByRole('button', {
        name: /helptext\.button_title/i,
      }),
    ).toBeInTheDocument();
  });

  it('should not render help text if no help text is supplied', () => {
    render();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should render in a <h3> when a header text is supplied', () => {
    const id = 'mock-id';
    render({ id, textResourceBindings: { title: '### Hello world' } });

    expect(screen.getByTestId(`paragraph-component-${id}`).children[0].tagName).toEqual('H3');
  });

  it('should render in a <p> when regular text content is supplied', () => {
    const id = 'mock-id';
    render({
      id,
      text: (
        <>
          Hello world with line
          <br />
          break
        </>
      ),
    });

    expect(screen.getByTestId(`paragraph-component-${id}`).children[0].tagName).toEqual('P');
  });
});

const render = (props: Partial<IParagraphProps> = {}) => {
  const allProps = {
    id: 'abc123',
    type: 'Paragraph',
    textResourceBindings: {
      title: 'paragraph text content',
    },
    getTextResource: (key: string) => key,
    getTextResourceAsString: (key: string) => key,
    ...props,
  } as IParagraphProps;

  rtlRender(<ParagraphComponent {...allProps} />);
};
