import type { ForwardedRef, MouseEvent } from 'react';
import React from 'react';
import type { ButtonRouterLinkProps } from './ButtonRouterLink';
import { ButtonRouterLink } from './ButtonRouterLink';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// Test data:
const to = '/test';
const defaultProps: ButtonRouterLinkProps = { to };

describe('ButtonRouterLink', () => {
  it('Renders a link', () => {
    const name = 'Link name';
    renderButtonRouterLink({ children: name });
    expect(screen.getByRole('link', { name })).toBeInTheDocument();
  });

  it('Navigates to the given route when clicked', async () => {
    const user = userEvent.setup();
    const initialPath = '/';
    const testPath = '/test';
    const testContent = 'Test';
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <ButtonRouterLink to={testPath} />
        <Routes>
          <Route path={initialPath} element={null} />
          <Route path={testPath} element={testContent} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByText(testContent)).not.toBeInTheDocument();
    await user.click(screen.getByRole('link'));
    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  it('Renders the path in the href attribute', () => {
    renderButtonRouterLink();
    expect(screen.getByRole('link')).toHaveAttribute('href', to);
  });

  it('Forwards the ref to the link element if given', () => {
    const ref = React.createRef<HTMLButtonElement>();
    renderButtonRouterLink({}, ref);
    expect(ref.current).toBe(screen.getByRole('link'));
  });

  it('Applies the given className to the link element', () => {
    const className = 'test-class';
    renderButtonRouterLink({ className });
    expect(screen.getByRole('link')).toHaveClass(className);
  });

  it('Calls the onClick callback with the mouse event when the user clicks the link', async () => {
    const onClick = jest.fn();
    renderButtonRouterLink({ onClick });
    const target: HTMLAnchorElement = screen.getByRole('link');
    await userEvent.click(target);
    expect(onClick).toHaveBeenCalledTimes(1);
    const expectedEvent: MouseEvent<HTMLAnchorElement> = expect.objectContaining({ target });
    expect(onClick).toHaveBeenCalledWith(expectedEvent);
  });
});

function renderButtonRouterLink(
  props: Partial<ButtonRouterLinkProps> = {},
  ref?: ForwardedRef<HTMLButtonElement>,
): RenderResult {
  return render(<ButtonRouterLink {...defaultProps} {...props} ref={ref} />, {
    wrapper: MemoryRouter,
  });
}
