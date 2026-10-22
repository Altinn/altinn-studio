import React from 'react';

import { screen } from '@testing-library/react';

import { LinkToPotentialNode } from 'src/components/form/LinkToPotentialNode';
import { parseAndCleanText } from 'src/language/sharedLanguage';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

type LinkSpec = { targetId: string; text: string };

/**
 * Renders the links the same way as text resources using linkToComponent, i.e. as parsed HTML without keys.
 */
function Links({ links }: { links: LinkSpec[] }) {
  const items = links.map(
    ({ targetId, text }) =>
      `<li><a href="/FormLayout?focusComponentId=${targetId}" data-link-type="LinkToPotentialNode">${text}</a></li>`,
  );
  return parseAndCleanText(`<ul>${items.join('')}</ul>`);
}

const render = (element: React.ReactElement) =>
  renderWithInstanceAndLayout({
    renderer: element,
    queries: {
      fetchLayouts: async () => ({
        FormLayout: {
          data: {
            layout: ['paragraph1', 'paragraph2', 'paragraph3'].map((id) => ({
              id,
              type: 'Paragraph' as const,
              textResourceBindings: { title: id },
            })),
          },
        },
      }),
    },
  });

describe('LinkToPotentialNode', () => {
  it('should render a link to an existing component', async () => {
    await render(
      <LinkToPotentialNode to='/FormLayout?focusComponentId=paragraph1'>Go to paragraph 1</LinkToPotentialNode>,
    );

    expect(screen.getByRole('link', { name: 'Go to paragraph 1' })).toHaveAttribute(
      'href',
      expect.stringContaining('focusComponentId=paragraph1'),
    );
  });

  it('should not crash when a link is removed from the middle of a rendered list', async () => {
    const paragraph1 = { targetId: 'paragraph1', text: 'Paragraph 1' };
    const paragraph2 = { targetId: 'paragraph2', text: 'Paragraph 2' };
    const paragraph3 = { targetId: 'paragraph3', text: 'Paragraph 3' };

    const { rerender } = await render(<Links links={[paragraph1, paragraph2, paragraph3]} />);

    expect(screen.getAllByRole('link').map((el) => el.textContent)).toEqual([
      'Paragraph 1',
      'Paragraph 2',
      'Paragraph 3',
    ]);

    rerender(<Links links={[paragraph1, paragraph3]} />);

    expect(screen.getAllByRole('link').map((el) => el.textContent)).toEqual(['Paragraph 1', 'Paragraph 3']);
    expect(screen.getByRole('link', { name: 'Paragraph 3' })).toHaveAttribute(
      'href',
      expect.stringContaining('focusComponentId=paragraph3'),
    );
  });
});
