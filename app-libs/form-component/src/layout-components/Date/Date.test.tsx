import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { Date } from './Date';

const render = (props?: Partial<ComponentProps<typeof Date>>) =>
  renderWithTranslations(<Date componentId='date-1' value='20.07.2026' {...props} />);

describe('Date', () => {
  it('shows the date value', () => {
    render();
    expect(screen.getByText('20.07.2026')).toBeInTheDocument();
  });

  it('shows the title when provided', () => {
    render({ title: 'my.title' });
    expect(screen.getByText('my.title')).toBeInTheDocument();
    expect(screen.getByText('20.07.2026')).toBeInTheDocument();
  });

  it('renders the form-content wrapper when a title is set', () => {
    render({ title: 'my.title', componentId: 'date-preview' });
    expect(document.getElementById('form-content-date-preview')).toBeInTheDocument();
  });
});
