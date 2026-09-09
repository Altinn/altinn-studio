import React from 'react';

import { screen } from '@testing-library/react';
import ResizeObserverModule from 'resize-observer-polyfill';

import { HeadingComponent } from 'src/layout/Heading/HeadingComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

global.ResizeObserver = ResizeObserverModule;

const render = async ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'Heading'>> = {}) => {
  await renderGenericComponentTest({
    type: 'Heading',
    renderer: (props) => <HeadingComponent {...props} />,
    component: {
      textResourceBindings: { title: 'The heading title' },
      ...component,
    },
    genericProps,
  });
};

describe('HeadingComponent', () => {
  it('resolves the title binding and renders it as a heading', async () => {
    await render({ component: { size: 'L' } });

    expect(screen.getByRole('heading', { level: 2, name: 'The heading title' })).toBeInTheDocument();
  });

  it('maps the configured size to the heading level', async () => {
    await render({ component: { size: 'S' } });

    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
  });

  it('should not render help button when help text is not defined', async () => {
    await render();

    expect(screen.queryByRole('button', { name: /Hjelp/i })).not.toBeInTheDocument();
  });

  it('should render help button when help text is defined', async () => {
    await render({
      component: {
        textResourceBindings: { title: 'The heading title', help: 'this is the help text' },
      },
    });

    expect(screen.getByRole('button', { name: /Hjelp/i })).toBeInTheDocument();
  });
});
