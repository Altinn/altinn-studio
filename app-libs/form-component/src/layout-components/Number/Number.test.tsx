import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { NumberLayout } from './NumberLayout';

describe('NumberLayout', () => {
  it('renders the numeric value', () => {
    renderWithTranslations(<NumberLayout value={12345} />);
    expect(screen.getByText('12345')).toBeInTheDocument();
  });

  it('returns null for NaN', () => {
    const { container } = renderWithTranslations(<NumberLayout value={NaN} />);
    expect(container.firstChild).toBeNull();
  });

  it('applies thousand separator formatting', () => {
    renderWithTranslations(
      <NumberLayout value={1234567} formatting={{ number: { thousandSeparator: ' ' } }} />,
    );
    expect(screen.getByText('1 234 567')).toBeInTheDocument();
  });

  it('renders with title and label association', () => {
    renderWithTranslations(<NumberLayout value={42} title='number.title' componentId='num-1' />, {
      overrides: { 'number.title': 'Antall' },
    });
    expect(screen.getByText('Antall')).toBeInTheDocument();
    expect(document.getElementById('label-num-1')).toBeInTheDocument();
  });

  it('renders icon when iconUrl and title are provided', () => {
    renderWithTranslations(
      <NumberLayout
        value={99}
        title='number.title'
        icon='https://example.com/icon.svg'
        componentId='num-1'
      />,
      { overrides: { 'number.title': 'Resultat' } },
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/icon.svg');
    expect(img).toHaveAttribute('alt', 'Resultat');
  });

  it('does not render icon when title is absent', () => {
    renderWithTranslations(<NumberLayout value={99} icon='https://example.com/icon.svg' />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders horizontal direction by default', () => {
    const { container } = renderWithTranslations(<NumberLayout value={1} title='t' />, {
      overrides: { t: 'T' },
    });
    expect((container.firstChild as HTMLElement).className).toContain('horizontal');
  });

  it('renders vertical direction', () => {
    const { container } = renderWithTranslations(
      <NumberLayout value={1} title='t' direction='vertical' />,
      { overrides: { t: 'T' } },
    );
    expect((container.firstChild as HTMLElement).className).toContain('vertical');
  });

  it('renders validation messages when provided', () => {
    renderWithTranslations(
      <NumberLayout
        value={1}
        title='t'
        componentId='num-1'
        validationMessages={<span>Feil</span>}
      />,
      { overrides: { t: 'T' } },
    );
    expect(screen.getByText('Feil')).toBeInTheDocument();
  });

  it('does not render validation area when validationMessages is undefined', () => {
    renderWithTranslations(<NumberLayout value={1} title='t' componentId='num-1' />, {
      overrides: { t: 'T' },
    });
    expect(document.getElementById('form-content-num-1')?.children).toHaveLength(1);
  });

  it('renders form-content wrapper with componentId', () => {
    renderWithTranslations(<NumberLayout value={1} title='t' componentId='num-1' />, {
      overrides: { t: 'T' },
    });
    expect(document.getElementById('form-content-num-1')).toBeInTheDocument();
  });

  it('does not render form-content wrapper when componentId is undefined', () => {
    const { container } = renderWithTranslations(<NumberLayout value={1} title='t' />, {
      overrides: { t: 'T' },
    });
    expect(container.querySelector('[id^="form-content-"]')).not.toBeInTheDocument();
  });
});
