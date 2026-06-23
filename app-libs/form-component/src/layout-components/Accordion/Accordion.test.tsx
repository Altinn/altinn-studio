import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { Accordion } from './Accordion';

describe('Accordion', () => {
  it('resolves the title through translation, renders children, and is closed by default', () => {
    renderWithTranslations(
      <Accordion title='my.title'>
        <p>Child content</p>
      </Accordion>,
      { overrides: { 'my.title': 'Resolved Title' } },
    );

    const button = screen.getByRole('button', { name: 'Resolved Title' });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
    // openByDefault is omitted, so the accordion starts closed.
    expect(button.parentElement).not.toHaveAttribute('open');
  });

  it('uses the id for data-testid', () => {
    renderWithTranslations(
      <Accordion id='acc-1' title='x'>
        <p>Body</p>
      </Accordion>,
    );

    expect(screen.getByTestId('accordion-component-acc-1')).toBeInTheDocument();
  });

  it('opens by default when openByDefault is true', () => {
    renderWithTranslations(
      <Accordion title='x' openByDefault>
        <p>Body</p>
      </Accordion>,
    );

    const button = screen.getByRole('button', { name: 'x' });
    expect(button.parentElement).toHaveAttribute('open');
  });

  it('renders without children', () => {
    renderWithTranslations(<Accordion title='x' />);

    expect(screen.getByRole('button', { name: 'x' })).toBeInTheDocument();
  });

  it('forwards className to the rendered accordion element', () => {
    renderWithTranslations(
      <Accordion title='x' className='foo'>
        <p>Body</p>
      </Accordion>,
    );

    // className is threaded into AccordionItem, which lands on the <Details>
    // element that is the parent of the summary button.
    const button = screen.getByRole('button', { name: 'x' });
    expect(button.parentElement).toHaveClass('foo');
  });

  it('wraps in Card by default (renderAsCard=true)', () => {
    const { container } = renderWithTranslations(
      <Accordion title='x'>
        <p>Body</p>
      </Accordion>,
    );

    expect(container.querySelector('[data-color="neutral"]')).toBeInTheDocument();
  });

  it('does not wrap in Card when renderAsCard is false', () => {
    const { container } = renderWithTranslations(
      <Accordion title='x' renderAsCard={false}>
        <p>Body</p>
      </Accordion>,
    );

    expect(container.querySelector('[data-color="neutral"]')).not.toBeInTheDocument();
  });
});
