import React from 'react';
import { render as rtlRender, screen, within } from '@testing-library/react';
import type { ServiceOwnerSelectorProps } from './ServiceOwnerSelector';
import { ServiceOwnerSelector } from './ServiceOwnerSelector';
import { textMock } from '../../../testing/mocks/i18nMock';
import { user } from 'app-shared/mocks/mocks';

const defaultProps = {
  selectedOrgOrUser: 'userLogin',
  user: {
    ...user,
    login: 'userLogin',
  },
  organizations: [
    {
      avatar_url: '',
      id: 1,
      username: 'organizationUsername',
    },
  ],
  errorMessage: '',
  name: '',
};

const render = (props: Partial<ServiceOwnerSelectorProps> = {}) => {
  rtlRender(<ServiceOwnerSelector {...defaultProps} {...props} />);
};

describe('ServiceOwnerSelector', () => {
  it('renders select with all options', async () => {
    render();

    const select = screen.getByLabelText(textMock('general.service_owner'));
    expect(
      within(select).getByRole('option', { name: defaultProps.user.login }),
    ).toBeInTheDocument();
    expect(
      within(select).getByRole('option', { name: defaultProps.organizations[0].username }),
    ).toBeInTheDocument();
  });

  it('shows validation errors', async () => {
    const errorMessage = 'Field cannot be empty';

    render({ errorMessage });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('selects the user when the current context is the user', async () => {
    const selectedOrgOrUser = defaultProps.user.login;

    render({ selectedOrgOrUser });

    const select = screen.getByLabelText(textMock('general.service_owner'));
    expect(select).toHaveValue(selectedOrgOrUser);
  });

  it('selects the org when the current context is the org', async () => {
    const selectedOrgOrUser = defaultProps.organizations[0].username;

    render({ selectedOrgOrUser });

    const select = screen.getByLabelText(textMock('general.service_owner'));
    expect(select).toHaveValue(selectedOrgOrUser);
  });
});
