import React from 'react';
import { screen } from '@testing-library/react';
import {
  NewApplicationForm,
  type NewApplicationFormProps,
  type ActionableElement,
} from './NewApplicationForm';
import { type User } from 'app-shared/types/Repository';
import { type Organization } from 'app-shared/types/Organization';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { useUserOrgPermissionQuery } from '../../hooks/queries/useUserOrgPermissionsQuery';

const mockOnSubmit = jest.fn();

const mockUser: User = {
  id: 1,
  avatar_url: '',
  email: 'test@test.com',
  full_name: 'Test Tester',
  login: 'test',
  userType: 0,
};

const mockOrg: Organization = {
  avatar_url: '',
  id: 1,
  username: 'unit-test',
  full_name: 'unit-test',
};
const mockOrganizations: Organization[] = [mockOrg];

const mockOnClickCancelButton = jest.fn();
const mockCancelComponentButton: ActionableElement = {
  onClick: mockOnClickCancelButton,
  type: 'button',
};

const mockSubmitbuttonText: string = 'Submit';

const defaultProps: NewApplicationFormProps = {
  onSubmit: mockOnSubmit,
  user: mockUser,
  organizations: mockOrganizations,
  isLoading: false,
  submitButtonText: mockSubmitbuttonText,
  formError: {
    org: '',
    repoName: '',
  },
  setFormError: jest.fn(),
  actionableElement: mockCancelComponentButton,
};

jest.mock('../../hooks/queries/useUserOrgPermissionsQuery');

(useUserOrgPermissionQuery as jest.Mock).mockReturnValue({
  data: { canCreateOrgRepo: true },
});

describe('NewApplicationForm', () => {
  afterEach(jest.clearAllMocks);

  it('calls onSubmit when form is submitted with valid data', async () => {
    const user = userEvent.setup();
    renderNewApplicationForm();

    const select = screen.getByLabelText(textMock('general.service_owner'));
    await user.click(select);
    const orgOption = screen.getByRole('option', { name: mockUser.full_name });
    await user.click(orgOption);

    const repoTextField = screen.getByLabelText(textMock('general.service_name'));
    expect(repoTextField).toHaveValue('');
    const newRepoValue: string = 'repo';
    await user.type(repoTextField, newRepoValue);
    expect(screen.getByLabelText(textMock('general.service_name'))).toHaveValue(newRepoValue);

    const submitButton = screen.getByRole('button', { name: mockSubmitbuttonText });
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).toHaveBeenCalledWith({
      org: mockUser.login,
      repoName: newRepoValue,
    });
  });

  it('does not call onSubmit when form is submitted with invalid data', async () => {
    const user = userEvent.setup();
    renderNewApplicationForm();

    const select = screen.getByLabelText(textMock('general.service_owner'));
    await user.click(select);
    const orgOption = screen.getByRole('option', { name: mockUser.full_name });
    await user.click(orgOption);

    const repoTextField = screen.getByLabelText(textMock('general.service_name'));
    await user.click(repoTextField);

    const submitButton = screen.getByRole('button', { name: mockSubmitbuttonText });
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledTimes(0);
  });

  it('should inform the user if he/she cannot create new application for the organization', async () => {
    const user = userEvent.setup();
    (useUserOrgPermissionQuery as jest.Mock).mockReturnValue({
      data: { canCreateOrgRepo: false },
    });
    renderNewApplicationForm(defaultProps);

    const serviceOwnerSelect = screen.getByLabelText(textMock('general.service_owner'));
    await user.selectOptions(serviceOwnerSelect, mockOrg.username);
    expect(
      await screen.findByText(textMock('dashboard.missing_service_owner_rights_error_message')),
    ).toBeInTheDocument();
  });

  it('should not display error if user has access to create org', async () => {
    const user = userEvent.setup();
    (useUserOrgPermissionQuery as jest.Mock).mockReturnValue({
      data: { canCreateOrgRepo: true },
    });
    renderNewApplicationForm(defaultProps);

    const serviceOwnerSelect = screen.getByLabelText(textMock('general.service_owner'));
    await user.selectOptions(serviceOwnerSelect, mockOrg.username);
    expect(
      screen.queryByText(textMock('dashboard.missing_service_owner_rights_error_message')),
    ).not.toBeInTheDocument();
  });
});

function renderNewApplicationForm(
  newApplicationFormProps: Partial<NewApplicationFormProps>,
  services?: Partial<ServicesContextProps>,
) {
  return renderWithProviders(
    <ServicesContextProvider>
      <NewApplicationForm {...defaultProps} {...newApplicationFormProps} />
    </ServicesContextProvider>,
    {
      queries: services,
      queryClient: createQueryClientMock(),
    },
  );
}
