import React from 'react';

import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import ResizeObserverModule from 'resize-observer-polyfill';

import { HeaderComponent } from 'src/layout/Header/HeaderComponent';
import type { IHeaderProps } from 'src/layout/Header/HeaderComponent';

(global as any).ResizeObserver = ResizeObserverModule;

const render = (props = {}) => {
  const allProps = {
    id: 'id',
    text: 'text',
    getTextResource: (key: string) => key,
    language: {},
    textResourceBindings: {},
    ...props,
  } as IHeaderProps;

  rtlRender(<HeaderComponent {...allProps} />);
};

describe('HeaderComponent', () => {
  it('should render <h2> when size is "L"', () => {
    render({ size: 'L' });

    const header = screen.getByRole('heading', { level: 2 });
    expect(header).toBeInTheDocument();
  });

  it('should render <h2> when size is "h2"', () => {
    render({ size: 'h2' });

    const header = screen.getByRole('heading', { level: 2 });
    expect(header).toBeInTheDocument();
  });

  it('should render <h3> when size is "M"', () => {
    render({ size: 'M' });

    const header = screen.getByRole('heading', { level: 3 });
    expect(header).toBeInTheDocument();
  });

  it('should render <h3> when size is "h3"', () => {
    render({ size: 'h3' });

    const header = screen.getByRole('heading', { level: 3 });
    expect(header).toBeInTheDocument();
  });

  it('should render <h4> when size is "S"', () => {
    render({ size: 'S' });

    const header = screen.getByRole('heading', { level: 4 });
    expect(header).toBeInTheDocument();
  });

  it('should render <h4> when size is "h4"', () => {
    render({ size: 'h4' });

    const header = screen.getByRole('heading', { level: 4 });
    expect(header).toBeInTheDocument();
  });

  it('should render <h4> when size is not defined', () => {
    render();

    const header = screen.getByRole('heading', { level: 4 });
    expect(header).toBeInTheDocument();
  });

  it('should not render help button when help text is not defined', () => {
    render();

    const helpButton = screen.queryByRole('button', {
      name: /helptext\.button_title/i,
    });

    expect(helpButton).not.toBeInTheDocument();
  });

  it('should render help button when help text is defined', () => {
    render({
      textResourceBindings: {
        help: 'this is the help text',
      },
    });

    const helpButton = screen.getByRole('button', {
      name: /helptext\.button_title/i,
    });

    expect(helpButton).toBeInTheDocument();
  });

  it('should show and hide help text when clicking help button', async () => {
    const helpText = 'this is the help text';
    render({
      textResourceBindings: {
        help: helpText,
      },
    });

    const helpButton = screen.getByRole('button', {
      name: /helptext\.button_title/i,
    });

    expect(screen.queryByText(helpText)).not.toBeInTheDocument();
    fireEvent.click(helpButton);
    expect(screen.getByText(helpText)).toBeInTheDocument();
    fireEvent.click(helpButton);

    expect(screen.queryByText(helpText)).not.toBeInTheDocument();
  });
});
