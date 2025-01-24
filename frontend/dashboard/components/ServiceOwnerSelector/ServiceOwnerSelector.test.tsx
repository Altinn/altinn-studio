import React from 'react';
import { act, render, screen } from '@testing-library/react';
import type { ServiceOwnerSelectorProps } from './ServiceOwnerSelector';
import { ServiceOwnerSelector } from './ServiceOwnerSelector';
import { textMock } from '../../../testing/mocks/i18nMock';
import { user as mockUser } from 'app-shared/mocks/mocks';
import userEvent from '@testing-library/user-event';

const defaultProps: ServiceOwnerSelectorProps = {
  selectedOrgOrUser: 'userLogin',
  user: {
    ...mockUser,
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
  onChange: () => {},
};

const renderServiceOwnerSelector = (props: Partial<ServiceOwnerSelectorProps> = {}) => {
  render(<ServiceOwnerSelector {...defaultProps} {...props} />);
};

describe('ServiceOwnerSelector', () => {
  afterEach(jest.clearAllMocks);

  it('renders select with all options', async () => {
    const user = userEvent.setup();
    renderServiceOwnerSelector();

    const select = screen.getByLabelText(textMock('general.service_owner'));
    await act(() => user.click(select));

    expect(screen.getByRole('option', { name: defaultProps.user.login })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: defaultProps.organizations[0].username }),
    ).toBeInTheDocument();
  });

  it('shows validation errors', async () => {
    const errorMessage = 'Field cannot be empty';

    renderServiceOwnerSelector({ errorMessage });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('selects the org when the current context is the org', async () => {
    const selectedOrgOrUser = defaultProps.organizations[0].username;

    renderServiceOwnerSelector({ selectedOrgOrUser });

    const select = screen.getByLabelText(textMock('general.service_owner'));
    expect(select).toHaveValue(selectedOrgOrUser);
  });

  it('selects the user when the current context is the user', async () => {
    const selectedOrgOrUser = defaultProps.user.login;

    renderServiceOwnerSelector({ selectedOrgOrUser });

    const select = screen.getByLabelText(textMock('general.service_owner'));
    expect(select).toHaveValue(selectedOrgOrUser);
  });

  it('selects the user when the current context is invalid', async () => {
    const selectedOrgOrUser = 'all';

    renderServiceOwnerSelector({ selectedOrgOrUser });

    const select = screen.getByLabelText(textMock('general.service_owner'));
    expect(select).toHaveValue(defaultProps.user.login);
  });

  it('should execute the onChange callback when service owner is changed', async () => {
    const user = userEvent.setup();
    const selectedOrgOrUser = 'all';
    const onChangeMock = jest.fn();
    renderServiceOwnerSelector({ selectedOrgOrUser, onChange: onChangeMock });

    const select = screen.getByLabelText(textMock('general.service_owner'));
    await user.selectOptions(select, 'organizationUsername');
    expect(onChangeMock).toHaveBeenCalledWith('organizationUsername');
    expect(onChangeMock).toHaveBeenCalledTimes(1);
  });
});
