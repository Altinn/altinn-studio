import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { Number } from './Number';

const render = (props?: Partial<ComponentProps<typeof Number>>) =>
  renderWithTranslations(<Number componentId='number-1' value={42} {...props} />);

describe('Number', () => {
  it('shows the number value', () => {
    render();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows the title when provided', () => {
    render({ title: 'my.title' });
    expect(screen.getByText('my.title')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders the form-content wrapper when a title is set', () => {
    render({ title: 'my.title', componentId: 'number-preview' });
    expect(document.getElementById('form-content-number-preview')).toBeInTheDocument();
  });

  it('hides the title text but keeps the value when hideLabel is set', () => {
    render({ title: 'my.title', hideLabel: true, icon: 'https://example.com/icon.svg' });
    expect(screen.queryByText('my.title')).not.toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/icon.svg');
    expect(document.getElementById('form-content-number-1')).toBeInTheDocument();
  });

  it('does not render an icon when there is no title', () => {
    render({ icon: 'https://example.com/icon.svg' });
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
