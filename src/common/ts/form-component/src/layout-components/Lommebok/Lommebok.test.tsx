import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { Lommebok } from './Lommebok';

const render = (props?: Partial<ComponentProps<typeof Lommebok>>) =>
  renderWithTranslations(<Lommebok componentId='lommebok-1' title='my.title' {...props} />);

describe('Lommebok', () => {
  it('shows the title as a heading', () => {
    render();
    expect(screen.getByRole('heading', { name: 'my.title' })).toBeInTheDocument();
  });

  it('shows the description when provided', () => {
    render({ description: 'my.description' });
    expect(screen.getByText('my.description')).toBeInTheDocument();
  });

  it('does not show a description when not provided', () => {
    render();
    expect(screen.queryByText('my.description')).not.toBeInTheDocument();
  });

  it('renders children', () => {
    render({ children: <div>document list</div> });
    expect(screen.getByText('document list')).toBeInTheDocument();
  });

  it('sets the component id on the outer element', () => {
    render({ componentId: 'lommebok-preview' });
    expect(document.getElementById('lommebok-preview')).toBeInTheDocument();
  });
});
