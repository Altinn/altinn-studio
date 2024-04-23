import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MakeCopyModal, type MakeCopyModalProps } from './MakeCopyModal';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { type ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { type User } from 'app-shared/types/Repository';
import { type Organization } from 'app-shared/types/Organization';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

const org = 'org';
const app = 'app';
const mockServiceFullName: string = `${org}/${app}`;
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

jest.mock('../../hooks/mutations', () => ({
  useCopyAppMutation: jest.fn(),
}));
jest.mock('app-shared/navigation/PackagesRouter', () => ({
  navigateToPackage: jest.fn(),
}));

const mockOnClose = jest.fn();

const defaultProps: MakeCopyModalProps = {
  open: true,
  onClose: mockOnClose,
  serviceFullName: mockServiceFullName,
};

const renderWithMockServices = (services?: Partial<ServicesContextProps>) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], () => mockUser);
  queryClient.setQueryData([QueryKey.Organizations], () => mockOrganizations);

  render(
    <MockServicesContextWrapper customServices={services} client={queryClient}>
      <MakeCopyModal {...defaultProps} />
    </MockServicesContextWrapper>,
  );
};

describe('MakeCopyModal', () => {
  afterEach(jest.clearAllMocks);

  test('successfully adds the values and submits the copy of a new application', async () => {
    const user = userEvent.setup();
    renderWithMockServices();

    const select = screen.getByLabelText(textMock('general.service_owner'));
    await user.click(select);
    const orgOption = screen.getByRole('option', { name: mockUser.full_name });
    await user.click(orgOption);

    const repoTextfield = screen.getByLabelText(textMock('general.service_name'));
    const newRepoValue: string = 'new-repo-name';
    await user.type(repoTextfield, newRepoValue);

    const copyButton = screen.getByRole('button', { name: textMock('dashboard.make_copy') });
    await user.click(copyButton);

    expect(queriesMock.copyApp).toHaveBeenCalledTimes(1);
    expect(queriesMock.copyApp).toHaveBeenCalledWith(org, app, newRepoValue, mockUser.login);
  });

  test('should show error message when clicking confirm without adding name', async () => {
    const user = userEvent.setup();
    renderWithMockServices();

    const confirmButton = screen.getByRole('button', {
      name: textMock('dashboard.make_copy'),
    });
    await user.click(confirmButton);
    const errorMessageElement = screen.getAllByText(textMock('dashboard.field_cannot_be_empty'));
    expect(errorMessageElement.length).toBeGreaterThan(0);
  });

  test('should show error message when clicking confirm and name is too long', async () => {
    const user = userEvent.setup();
    renderWithMockServices();

    const confirmButton = screen.getByRole('button', {
      name: textMock('dashboard.make_copy'),
    });
    const inputField = screen.getByRole('textbox', { name: textMock('general.service_name') });
    await user.type(inputField, 'this-new-name-is-way-too-long-to-be-valid');
    await user.click(confirmButton);
    const errorMessageElements = screen.getAllByText(
      textMock('dashboard.service_name_is_too_long'),
    );
    expect(errorMessageElements.length).toBeGreaterThan(0);
  });

  test('should show error message when clicking confirm and name contains invalid characters', async () => {
    const user = userEvent.setup();
    renderWithMockServices();

    const confirmButton = screen.getByRole('button', {
      name: textMock('dashboard.make_copy'),
    });
    const inputField = screen.getByRole('textbox', { name: textMock('general.service_name') });
    await user.type(inputField, 'this name is invalid');
    await user.click(confirmButton);
    const errorMessageElements = screen.getAllByText(
      textMock('dashboard.service_name_has_illegal_characters'),
    );
    expect(errorMessageElements.length).toBeGreaterThan(0);
  });
});
