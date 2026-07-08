import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { Alert } from './Alert';

describe('Alert', () => {
  it('resolves and displays the title key', () => {
    renderWithTranslations(<Alert componentId='a1' severity='info' title='my.title' />, {
      overrides: { 'my.title': 'Title for alert' },
    });
    expect(screen.getByText('Title for alert')).toBeInTheDocument();
  });

  it('resolves and displays the body key', () => {
    renderWithTranslations(<Alert componentId='a1' severity='info' body='my.body' />, {
      overrides: { 'my.body': 'Body for alert' },
    });
    expect(screen.getByText('Body for alert')).toBeInTheDocument();
  });

  it('does not set role or aria-live when not used as a screen-reader alert', () => {
    const { container } = renderWithTranslations(
      <Alert componentId='a1' severity='info' title='my.title' useAsAlert={false} />,
      { overrides: { 'my.title': 'Title for alert' } },
    );
    const alert = container.querySelector('[data-color]');
    expect(alert).not.toHaveAttribute('role');
    expect(alert).not.toHaveAttribute('aria-live');
  });

  it.each(['warning', 'danger'] as const)(
    'uses role="alert" for the critical severity "%s"',
    (severity) => {
      renderWithTranslations(
        <Alert componentId='a1' severity={severity} title='my.title' useAsAlert />,
        {
          overrides: { 'my.title': 'Title for alert' },
        },
      );
      expect(screen.getByRole('alert', { name: 'Title for alert' })).toBeInTheDocument();
    },
  );

  it.each(['info', 'success'] as const)(
    'uses role="status" for the non-critical severity "%s"',
    (severity) => {
      renderWithTranslations(
        <Alert componentId='a1' severity={severity} title='my.title' useAsAlert />,
        {
          overrides: { 'my.title': 'Title for alert' },
        },
      );
      expect(screen.getByRole('status', { name: 'Title for alert' })).toBeInTheDocument();
    },
  );

  it('does not combine role with an explicit aria-live (avoids VoiceOver double-speak)', () => {
    renderWithTranslations(
      <Alert componentId='a1' severity='danger' title='my.title' useAsAlert />,
      {
        overrides: { 'my.title': 'Title for alert' },
      },
    );
    expect(screen.getByRole('alert')).not.toHaveAttribute('aria-live');
  });

  it('uses the ariaLabel override for the live-region name when provided', () => {
    renderWithTranslations(
      <Alert
        componentId='a1'
        severity='danger'
        title='my.title'
        ariaLabel='Custom label'
        useAsAlert
      />,
      { overrides: { 'my.title': 'Title for alert' } },
    );
    expect(screen.getByRole('alert', { name: 'Custom label' })).toBeInTheDocument();
  });

  it('renders the form-content wrapper for the given componentId', () => {
    renderWithTranslations(<Alert componentId='alert-1' severity='info' title='my.title' />);
    expect(document.getElementById('form-content-alert-1')).toBeInTheDocument();
  });
});
