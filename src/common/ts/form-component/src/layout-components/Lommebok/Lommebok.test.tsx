import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { Lommebok } from './Lommebok';

const render = (props?: Partial<ComponentProps<typeof Lommebok>>) =>
  renderWithTranslations(<Lommebok componentId='lommebok-1' {...props} />);

describe('Lommebok', () => {
  it('shows the placeholder text', () => {
    render();
    expect(screen.getByText('Lommebok')).toBeInTheDocument();
  });

  it('shows the title when provided', () => {
    render({ title: 'my.title' });
    expect(screen.getByText('my.title')).toBeInTheDocument();
    expect(screen.getByText('Lommebok')).toBeInTheDocument();
  });

  it('renders the form-content wrapper', () => {
    render({ componentId: 'lommebok-preview' });
    expect(document.getElementById('form-content-lommebok-preview')).toBeInTheDocument();
  });
});
