import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { fireEvent, screen } from '@testing-library/react';

import { Header } from './Header';
import type { HeaderSize } from './Header';

describe('Header', () => {
  it.each<[HeaderSize | undefined, number]>([
    ['L', 2],
    ['h2', 2],
    ['M', 3],
    ['h3', 3],
    ['S', 4],
    ['h4', 4],
    [undefined, 4],
  ])('renders heading level %s → h%s', (size, level) => {
    renderWithTranslations(<Header componentId='h1' title='my.title' size={size} />, {
      overrides: { 'my.title': 'resolved title' },
    });
    expect(screen.getByRole('heading', { level })).toHaveTextContent('resolved title');
  });

  it('resolves the title key via the context', () => {
    renderWithTranslations(<Header componentId='h1' title='my.title' />, {
      overrides: { 'my.title': 'resolved title' },
    });
    expect(screen.getByRole('heading')).toHaveTextContent('resolved title');
  });

  it('does not render a help button when no help key is supplied', () => {
    renderWithTranslations(<Header componentId='h1' title='x' />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a help button when a help key is supplied', () => {
    renderWithTranslations(<Header componentId='h1' title='x' help='my.help' />, {
      overrides: { 'my.help': 'the help text' },
    });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows and hides the help text when clicking the help button', () => {
    renderWithTranslations(<Header componentId='h1' title='x' help='my.help' />, {
      overrides: { 'my.help': 'the help text' },
    });
    const helpButton = screen.getByRole('button');
    expect(helpButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(helpButton);
    expect(screen.getByText('the help text')).toBeInTheDocument();
    expect(helpButton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(helpButton);
    expect(helpButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders the form-content wrapper for the given componentId', () => {
    renderWithTranslations(<Header componentId='header-1' title='x' />);
    expect(document.getElementById('form-content-header-1')).toBeInTheDocument();
  });
});
