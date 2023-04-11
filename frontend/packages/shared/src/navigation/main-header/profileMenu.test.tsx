import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IProfileMenuComponentProps } from './profileMenu';
import { ProfileMenu } from './profileMenu';

const user = userEvent.setup();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
  useParams: () => ({
    org: 'company-id1',
    app: 'app-id1',
  }),
}));

const render = (props: Partial<IProfileMenuComponentProps> = {}) => {
  const allProps = {
    showlogout: false,
    ...props,
  } as IProfileMenuComponentProps;
  return rtlRender(<ProfileMenu {...allProps} />);
};

describe('ProfileMenu', () => {
  it('should match snapshot', () => {
    const { container } = render();
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        <button
          aria-label="profilikon knapp"
          class="Button-module_button__2ZuB7 Button-module_small__l39oh Button-module_quiet__1KlhF Button-module_primary__s1sM6 Button-module_onlyIcon__lENu3"
          type="button"
        >
          <svg
            aria-label="profilikon"
            class="Button-module_icon__-43u5"
            fill="none"
            focusable="false"
            height="1em"
            role="img"
            viewBox="0 0 24 24"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              clip-rule="evenodd"
              d="M3 12a9 9 0 1 1 14.882 6.812 6.002 6.002 0 0 0-11.764 0A8.98 8.98 0 0 1 3 12Zm5 8.064A8.963 8.963 0 0 0 12 21a8.963 8.963 0 0 0 4-.936V20a4 4 0 0 0-8 0v.064ZM12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM8 9a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z"
              fill="currentColor"
              fill-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    `);
  });

  it('should match snapshot with logout text', () => {
    const { container } = render({ showlogout: true });
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        <button
          aria-label="profilikon knapp"
          class="Button-module_button__2ZuB7 Button-module_small__l39oh Button-module_quiet__1KlhF Button-module_primary__s1sM6 Button-module_onlyIcon__lENu3"
          type="button"
        >
          <svg
            aria-label="profilikon"
            class="Button-module_icon__-43u5"
            fill="none"
            focusable="false"
            height="1em"
            role="img"
            viewBox="0 0 24 24"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              clip-rule="evenodd"
              d="M3 12a9 9 0 1 1 14.882 6.812 6.002 6.002 0 0 0-11.764 0A8.98 8.98 0 0 1 3 12Zm5 8.064A8.963 8.963 0 0 0 12 21a8.963 8.963 0 0 0 4-.936V20a4 4 0 0 0-8 0v.064ZM12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM8 9a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z"
              fill="currentColor"
              fill-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    `);
  });

  it('should show menu with link to documentation when clicking profile button', async () => {
    render();

    expect(screen.queryByRole('menuitem', { name: /dokumentasjon/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /åpne repository/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /logout/i })).not.toBeInTheDocument();

    const profileBtn = screen.getByRole('button', { name: /profilikon knapp/i });
    await act(() => user.click(profileBtn));

    expect(screen.getByRole('menuitem', { name: /dokumentasjon/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /åpne repository/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /logout/i })).not.toBeInTheDocument();
  });

  it('should show menu with link to documentation, logout and open repository when showlogout is true, window object has org and repo properties, and clicking profile button', async () => {
    delete window.location;
    window.location = new URL('https://www.example.com/editor/org/app') as unknown as Location;
    render({ showlogout: true });

    expect(
      screen.queryByRole('link', {
        name: /dokumentasjon/i,
      })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', {
        name: /åpne repository/i,
      })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', {
        name: /logout/i,
      })
    ).not.toBeInTheDocument();

    const profileBtn = screen.getByRole('button', {
      name: /profilikon knapp/i,
    });
    await act(() => user.click(profileBtn));

    expect(
      screen.getByRole('link', {
        name: /dokumentasjon/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /åpne repository/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', {
        name: /logout/i,
      })
    ).toBeInTheDocument();
  });
});
