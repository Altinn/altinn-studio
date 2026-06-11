import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { Paragraph } from './Paragraph';

describe('Paragraph', () => {
  it('resolves the title key via the context and renders it', () => {
    renderWithTranslations(<Paragraph id='p' title='my.title' />, {
      overrides: { 'my.title': 'resolved title' },
    });
    expect(screen.getByText('resolved title')).toBeInTheDocument();
  });

  it('uses the id for the data-testid', () => {
    renderWithTranslations(<Paragraph id='abc123' title='x' />);
    expect(screen.getByTestId('paragraph-component-abc123')).toBeInTheDocument();
  });

  it('does not render a help button when no help key is supplied', () => {
    renderWithTranslations(<Paragraph id='p' title='x' />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a help button when a help key is supplied', () => {
    renderWithTranslations(<Paragraph id='p' title='x' help='my.help' />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
