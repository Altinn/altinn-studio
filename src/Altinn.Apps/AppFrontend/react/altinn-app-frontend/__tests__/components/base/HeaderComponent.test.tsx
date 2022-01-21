import * as React from 'react';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitForElementToBeRemoved,
} from '@testing-library/react';

import { HeaderComponent } from '../../../src/components/base/HeaderComponent';
import { IComponentProps } from 'src/components';

const render = (props = {}) => {
  const allProps = {
    id: 'id',
    text: 'text',
    getTextResource: (key: string) => key,
    language: {},
    textResourceBindings: {},
    ...props,
  } as IComponentProps;

  rtlRender(<HeaderComponent {...allProps} />);
};

describe('components/base/HeaderComponent.tsx --- Snapshot', () => {
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
      name: /popover\.popover_button_helptext/i,
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
      name: /popover\.popover_button_helptext/i,
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
      name: /popover\.popover_button_helptext/i,
    });

    expect(screen.queryByText(helpText)).not.toBeInTheDocument();
    fireEvent.click(helpButton);
    expect(screen.getByText(helpText)).toBeInTheDocument();
    fireEvent.click(helpButton);

    await waitForElementToBeRemoved(() => screen.queryByText(helpText));

    expect(screen.queryByText(helpText)).not.toBeInTheDocument();
  });
});
