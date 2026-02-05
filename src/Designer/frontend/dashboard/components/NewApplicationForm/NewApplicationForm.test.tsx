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
import { type ProviderData, renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { FeatureFlag } from '@studio/feature-flags';
import { type CustomTemplateList } from 'app-shared/types/CustomTemplate';
import { QueryKey } from 'app-shared/types/QueryKey';

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

describe('NewApplicationForm', () => {
  afterEach(jest.clearAllMocks);

  it('calls onSubmit when form is submitted with valid data', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], mockUser);
    renderNewApplicationForm({}, { queryClient });

    const select = screen.getByRole('combobox', { name: textMock('general.service_owner') });
    await user.click(select);
    const orgOption = screen.getByRole('option', { name: mockUser.full_name });
    await user.click(orgOption);

    const repoTextField = screen.getByRole('textbox', { name: textMock('general.service_name') });
    expect(repoTextField).toHaveValue('');
    const newRepoValue: string = 'repo';
    await user.type(repoTextField, newRepoValue);
    expect(screen.getByRole('textbox', { name: textMock('general.service_name') })).toHaveValue(
      newRepoValue,
    );
    const submitButton = screen.getByRole('button', { name: mockSubmitbuttonText });
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).toHaveBeenCalledWith({
      org: mockUser.login,
      repoName: newRepoValue,
    });
  });

  it('shows spinner while user data is loading', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], undefined);
    renderNewApplicationForm({}, { queryClient });

    expect(screen.getByText(textMock('dashboard.loading'))).toBeInTheDocument();
  });

  it('does not call onSubmit when form is submitted with invalid data', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], mockUser);
    renderNewApplicationForm({}, { queryClient });

    const select = screen.getByRole('combobox', { name: textMock('general.service_owner') });
    await user.click(select);
    const orgOption = screen.getByRole('option', { name: mockUser.full_name });
    await user.click(orgOption);

    const repoTextField = screen.getByRole('textbox', { name: textMock('general.service_name') });
    await user.click(repoTextField);

    const submitButton = screen.getByRole('button', { name: mockSubmitbuttonText });
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledTimes(0);
  });

  it('should notify the user if they lack permission to create a new application for the organization and disable the "Create" button', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], mockUser);
    queryClient.setQueryData([QueryKey.UserOrgPermissions, mockOrg.username], {
      canCreateOrgRepo: false,
    });

    renderNewApplicationForm({}, { queryClient });

    const serviceOwnerSelect = screen.getByRole('combobox', {
      name: textMock('general.service_owner'),
    });
    await user.selectOptions(serviceOwnerSelect, mockOrg.username);
    expect(
      await screen.findByText(textMock('dashboard.missing_service_owner_rights_error_message')),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: mockSubmitbuttonText })).toBeDisabled();
  });

  it('should enable the "Create" button and not display an error if the user has permission to create an organization', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], mockUser);
    queryClient.setQueryData([QueryKey.UserOrgPermissions, mockOrg.username], {
      canCreateOrgRepo: true,
    });

    renderNewApplicationForm({}, { queryClient });

    const serviceOwnerSelect = screen.getByRole('combobox', {
      name: textMock('general.service_owner'),
    });
    await user.selectOptions(serviceOwnerSelect, mockOrg.username);
    expect(
      screen.queryByText(textMock('dashboard.missing_service_owner_rights_error_message')),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: mockSubmitbuttonText })).toBeEnabled();
  });

  it('should show custom template selector when feature is enabled', () => {
    const availableTemplatesMock: CustomTemplateList = {
      totalCount: 1,
      templates: [
        {
          id: 'template-1',
          name: { nb: 'Template 1' },
          description: { nb: 'Description 1' },
          owner: mockOrg.username,
        },
      ],
    };

    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], mockUser);
    queryClient.setQueryData(
      [QueryKey.CustomTemplates, mockUser.login],
      availableTemplatesMock.templates,
    );

    renderNewApplicationForm(
      { shouldUseCustomTemplate: true },
      { featureFlags: [FeatureFlag.CustomTemplates], queryClient },
    );
    expect(
      screen.getByText(textMock('dashboard.new_application_form.select_templates')),
    ).toBeInTheDocument();
  });

  it('should not show custom template selector when shouldUseCustomTemplate is false', () => {
    const availableTemplatesMock: CustomTemplateList = {
      totalCount: 1,
      templates: [
        {
          id: 'template-1',
          name: { nb: 'Template 1' },
          description: { nb: 'Description 1' },
          owner: mockOrg.username,
        },
      ],
    };

    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], mockUser);
    queryClient.setQueryData(
      [QueryKey.CustomTemplates, mockUser.login],
      availableTemplatesMock.templates,
    );

    renderNewApplicationForm(
      { shouldUseCustomTemplate: false },
      { featureFlags: [FeatureFlag.CustomTemplates], queryClient },
    );
    expect(
      screen.queryByText(textMock('dashboard.new_application_form.select_templates')),
    ).not.toBeInTheDocument();
  });

  it('should not show custom template selector when feature is disabled', () => {
    const availableTemplatesMock: CustomTemplateList = {
      totalCount: 1,
      templates: [
        {
          id: 'template-1',
          name: { nb: 'Template 1' },
          description: { nb: 'Description 1' },
          owner: mockOrg.username,
        },
      ],
    };
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], mockUser);
    queryClient.setQueryData(
      [QueryKey.CustomTemplates, mockUser.login],
      availableTemplatesMock.templates,
    );
    renderNewApplicationForm({}, { featureFlags: [], queryClient });
    expect(
      screen.queryByText(textMock('dashboard.new_application_form.select_templates')),
    ).not.toBeInTheDocument();
  });
});

function renderNewApplicationForm(
  newApplicationFormProps?: Partial<NewApplicationFormProps>,
  providerData: Partial<ProviderData> = {},
) {
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
  const defaultProviderData: ProviderData = {
    queries: {},
    queryClient: createQueryClientMock(),
    featureFlags: [],
  };
  return renderWithProviders(
    <NewApplicationForm {...defaultProps} {...newApplicationFormProps} />,
    { ...defaultProviderData, ...providerData },
  );
}
