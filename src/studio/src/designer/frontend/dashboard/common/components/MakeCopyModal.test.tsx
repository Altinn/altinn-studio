import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as networking from 'app-shared/utils/networking';
import { MakeCopyModal } from 'common/components/MakeCopyModal';
import type { IMakeCopyModalProps } from 'common/components/MakeCopyModal';

const user = userEvent.setup();
const org = 'org';
const app = 'app';

describe('MakeCopyModal', () => {
  it('should show error message when clicking confirm without adding name', async () => {
    render();

    expect(
      screen.queryByText(/dashboard\.field_cannot_be_empty/i),
    ).not.toBeInTheDocument();
    const confirmButton = screen.getByRole('button', {
      name: /dashboard\.make_copy/i,
    });
    await user.click(confirmButton);
    expect(
      screen.getByText(/dashboard\.field_cannot_be_empty/i),
    ).toBeInTheDocument();
  });

  it('should not show error message when clicking confirm and name is added', async () => {
    const postSpy = jest.spyOn(networking, 'post').mockResolvedValue(null);
    const repoName = 'newname';

    render();

    expect(
      screen.queryByText(/dashboard\.field_cannot_be_empty/i),
    ).not.toBeInTheDocument();
    const confirmButton = screen.getByRole('button', {
      name: /dashboard\.make_copy/i,
    });
    const inputField = screen.getByRole('textbox');
    await user.type(inputField, repoName);
    await user.click(confirmButton);
    expect(
      screen.queryByText(/dashboard\.field_cannot_be_empty/i),
    ).not.toBeInTheDocument();

    expect(postSpy).toHaveBeenCalledWith(
      `${window.location.origin}/designer/api/v1/repos/copyapp?org=${org}&sourceRepository=${app}&targetRepository=${repoName}`,
    );
  });

  it('should show error message when clicking confirm and name is too long', async () => {
    render();

    expect(
      screen.queryByText(/dashboard\.service_name_is_too_long/i),
    ).not.toBeInTheDocument();
    const confirmButton = screen.getByRole('button', {
      name: /dashboard\.make_copy/i,
    });
    const inputField = screen.getByRole('textbox');
    await user.type(inputField, 'this-new-name-is-way-too-long-to-be-valid');
    await user.click(confirmButton);
    expect(
      screen.getByText(/dashboard\.service_name_is_too_long/i),
    ).toBeInTheDocument();
  });

  it('should show error message when clicking confirm and name contains invalid characters', async () => {
    render();

    expect(
      screen.queryByText(/dashboard\.service_name_has_illegal_characters/i),
    ).not.toBeInTheDocument();
    const confirmButton = screen.getByRole('button', {
      name: /dashboard\.make_copy/i,
    });
    const inputField = screen.getByRole('textbox');
    await user.type(inputField, 'this name is invalid');
    await user.click(confirmButton);
    expect(
      screen.getByText(/dashboard\.service_name_has_illegal_characters/i),
    ).toBeInTheDocument();
  });
});

const render = (props: Partial<IMakeCopyModalProps> = {}) => {
  const initialState = {
    language: {
      language: {},
    },
  };
  const store = configureStore()(initialState);
  const anchor = document.querySelector('body');

  const allProps = {
    anchorEl: anchor,
    handleClose: jest.fn(),
    serviceFullName: `${org}/${app}`,
    ...props,
  };

  return rtlRender(
    <Provider store={store}>
      <MakeCopyModal {...allProps} />
    </Provider>,
  );
};
