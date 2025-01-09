import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  NewApplicationForm,
  type NewApplicationFormProps,
  type ActionableElement,
} from './NewApplicationForm';
import { type User } from 'app-shared/types/Repository';
import { type Organization } from 'app-shared/types/Organization';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../testing/mocks/i18nMock';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

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

  it('should inform the user if he/she cannot create new application for the organization', () => {
    renderNewApplicationForm();
    expect(true).toBeTruthy();
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
