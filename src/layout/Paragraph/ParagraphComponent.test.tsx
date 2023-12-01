import React from 'react';

import { screen } from '@testing-library/react';

import { ParagraphComponent } from 'src/layout/Paragraph/ParagraphComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

describe('ParagraphComponent', () => {
  it('should render with supplied text', async () => {
    const textContent = 'paragraph text content';
    await render({
      component: {
        textResourceBindings: {
          title: textContent,
        },
      },
    });

    expect(screen.getByText(textContent)).toBeInTheDocument();
  });

  it('should render help text if help text is supplied', async () => {
    await render({
      component: {
        textResourceBindings: { help: 'this is the help text' },
      },
    });

    expect(
      screen.getByRole('button', {
        name: /Hjelp/i,
      }),
    ).toBeInTheDocument();
  });

  it('should not render help text if no help text is supplied', async () => {
    await render();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should render in a <h3> when a header text is supplied', async () => {
    const id = 'mock-id';
    await render({ component: { id, textResourceBindings: { title: '### Hello world' } } });

    // eslint-disable-next-line testing-library/no-node-access
    expect(screen.getByTestId(`paragraph-component-${id}`).children[0].tagName).toEqual('H3');
  });

  it('should render in a <span> when text content is HTML', async () => {
    const id = 'mock-id';
    await render({
      component: {
        id,
        textResourceBindings: {
          title: 'Hello world with line<br>break',
        },
      },
    });
    // eslint-disable-next-line testing-library/no-node-access
    expect(screen.getByTestId(`paragraph-component-${id}`).children[0].tagName).toEqual('SPAN');
  });

  it('should render as a <p> when text content contains inline elements', async () => {
    [
      { id: 'mock-id1', tag: 'strong' },
      { id: 'mock-id2', tag: 'i' },
      { id: 'mock-id3', tag: 'a' },
      { id: 'mock-id4', tag: 'br' },
      { id: 'mock-id5' },
    ].forEach(async ({ id, tag }) => {
      await render({
        component: {
          id,
          textResourceBindings: {
            title: tag ? `Hello world with <${tag}>inline element</${tag}> text` : 'A simple string',
          },
        },
      });
      expect(screen.getByTestId(`paragraph-component-${id}`).tagName).toEqual('P');
    });
  });

  it('should render as a <div> when text content contains block-level elements', async () => {
    [
      { id: 'mock-id1', tag: 'div' },
      { id: 'mock-id2', tag: 'p' },
      { id: 'mock-id3', tag: 'h1' },
      { id: 'mock-id4', tag: 'ol' },
    ].forEach(async ({ id, tag }) => {
      await render({
        component: {
          id,
          textResourceBindings: {
            title: `Hello world with <${tag}>block-level element</${tag}> text`,
          },
        },
      });
      expect(screen.getByTestId(`paragraph-component-${id}`).tagName).toEqual('DIV');
    });
  });
});

const render = async ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'Paragraph'>> = {}) => {
  await renderGenericComponentTest({
    type: 'Paragraph',
    renderer: (props) => <ParagraphComponent {...props} />,
    component: {
      id: 'abc123',
      type: 'Paragraph',
      textResourceBindings: {
        title: 'paragraph text content',
      },
      ...component,
    },
    genericProps,
  });
};
