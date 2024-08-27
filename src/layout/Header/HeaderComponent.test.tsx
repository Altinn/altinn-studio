import React from 'react';

import { fireEvent, screen } from '@testing-library/react';
import ResizeObserverModule from 'resize-observer-polyfill';

import { HeaderComponent } from 'src/layout/Header/HeaderComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

global.ResizeObserver = ResizeObserverModule;

const render = async ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'Header'>> = {}) => {
  await renderGenericComponentTest({
    type: 'Header',
    renderer: (props) => <HeaderComponent {...props} />,
    component: {
      textResourceBindings: {},
      ...component,
    },
    genericProps,
  });
};
describe('HeaderComponent', () => {
  it('should render <h2> when size is "L"', async () => {
    await render({ component: { size: 'L' } });

    const header = screen.getByRole('heading', { level: 2 });
    expect(header).toBeInTheDocument();
  });

  it('should render <h2> when size is "h2"', async () => {
    await render({ component: { size: 'h2' } });

    const header = screen.getByRole('heading', { level: 2 });
    expect(header).toBeInTheDocument();
  });

  it('should render <h3> when size is "M"', async () => {
    await render({ component: { size: 'M' } });

    const header = screen.getByRole('heading', { level: 3 });
    expect(header).toBeInTheDocument();
  });

  it('should render <h3> when size is "h3"', async () => {
    await render({ component: { size: 'h3' } });

    const header = screen.getByRole('heading', { level: 3 });
    expect(header).toBeInTheDocument();
  });

  it('should render <h4> when size is "S"', async () => {
    await render({ component: { size: 'S' } });

    const header = screen.getByRole('heading', { level: 4 });
    expect(header).toBeInTheDocument();
  });

  it('should render <h4> when size is "h4"', async () => {
    await render({ component: { size: 'h4' } });

    const header = screen.getByRole('heading', { level: 4 });
    expect(header).toBeInTheDocument();
  });

  it('should render <h4> when size is not defined', async () => {
    await render();

    const header = screen.getByRole('heading', { level: 4 });
    expect(header).toBeInTheDocument();
  });

  it('should not render help button when help text is not defined', async () => {
    await render();

    const helpButton = screen.queryByRole('button', {
      name: /helptext\.button_title/i,
    });

    expect(helpButton).not.toBeInTheDocument();
  });

  it('should render help button when help text is defined', async () => {
    await render({
      component: {
        textResourceBindings: {
          help: 'this is the help text',
        },
      },
    });

    const helpButton = screen.getByRole('button', { name: /Hjelp/i });
    expect(helpButton).toBeInTheDocument();
  });

  it('should show and hide help text when clicking help button', async () => {
    const helpText = 'this is the help text';
    await render({
      component: {
        textResourceBindings: {
          help: helpText,
        },
      },
    });

    const helpButton = screen.getByRole('button', { name: /Hjelp/i });
    expect(screen.queryByText(helpText)).not.toBeInTheDocument();
    fireEvent.click(helpButton);
    expect(screen.getByText(helpText)).toBeInTheDocument();
    fireEvent.click(helpButton);

    expect(screen.queryByText(helpText)).not.toBeInTheDocument();
  });
});
