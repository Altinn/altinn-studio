import { render, screen } from '@testing-library/react';

import { Paragraph } from './Paragraph';

describe('Paragraph', () => {
  it('renders the title content', () => {
    render(<Paragraph id='abc' title='paragraph text content' />);

    expect(screen.getByText('paragraph text content')).toBeInTheDocument();
    expect(screen.getByTestId('paragraph-component-abc')).toBeInTheDocument();
  });

  it('wraps inline title in a <p> when titleIsInline is true', () => {
    render(
      <Paragraph
        id='abc'
        title='inline content'
        titleIsInline
      />,
    );

    const wrapper = screen.getByTestId('paragraph-component-abc');
    expect(wrapper.firstElementChild?.tagName).toEqual('P');
  });

  it('wraps block-level title in a <div> when titleIsInline is false', () => {
    render(
      <Paragraph
        id='abc'
        title={<h3>heading</h3>}
        titleIsInline={false}
      />,
    );

    const wrapper = screen.getByTestId('paragraph-component-abc');
    expect(wrapper.firstElementChild?.tagName).toEqual('DIV');
    expect(wrapper.firstElementChild?.firstElementChild?.tagName).toEqual('H3');
  });

  it('renders a help text button when helpText is provided', () => {
    render(
      <Paragraph
        id='abc'
        title='title'
        helpText='Some help'
        helpTitle='Hjelp for title'
      />,
    );

    expect(screen.getByRole('button', { name: /Hjelp for title/i })).toBeInTheDocument();
  });

  it('does not render a help text button when helpText is omitted', () => {
    render(
      <Paragraph
        id='abc'
        title='title'
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
