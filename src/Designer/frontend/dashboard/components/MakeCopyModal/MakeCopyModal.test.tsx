import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MakeCopyModal, type MakeCopyModalProps } from './MakeCopyModal';
import { textMock } from '../../../testing/mocks/i18nMock';
import { type ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { type User } from 'app-shared/types/Repository';
import { type Organization } from 'app-shared/types/Organization';
import { type ProviderData, renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { app, org } from '@studio/testing/testids';
import { useUserOrgPermissionQuery } from '../../hooks/queries/useUserOrgPermissionsQuery';

jest.mock('../../hooks/queries/useUserOrgPermissionsQuery');

(useUserOrgPermissionQuery as jest.Mock).mockReturnValue({
  data: { canCreateOrgRepo: true },
});

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
jest.mock('app-shared/navigation/PackagesRouter');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useParams: jest.fn().mockReturnValue(''),
}));

const mockOnClose = jest.fn();

const renderMakeCopyModal = (
  props?: Partial<MakeCopyModalProps>,
  providerData: Partial<ProviderData> = {},
  services?: Partial<ServicesContextProps>,
) => {
  const defaultProps: MakeCopyModalProps = {
    open: true,
    onClose: mockOnClose,
    serviceFullName: mockServiceFullName,
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], () => mockUser);
  queryClient.setQueryData([QueryKey.Organizations], () => mockOrganizations);

  const defaultProviderData: ProviderData = {
    queries: services,
    queryClient,
    featureFlags: [],
  };
  return renderWithProviders(<MakeCopyModal {...defaultProps} {...props} />, {
    ...defaultProviderData,
    ...providerData,
  });
};

describe('MakeCopyModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('successfully adds the values and submits the copy of a new application', async () => {
    const user = userEvent.setup();
    renderMakeCopyModal();

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
    renderMakeCopyModal();

    const confirmButton = screen.getByRole('button', {
      name: textMock('dashboard.make_copy'),
    });
    await user.click(confirmButton);
    const errorMessageElement = screen.getAllByText(textMock('dashboard.field_cannot_be_empty'));
    expect(errorMessageElement.length).toBeGreaterThan(0);
  });

  test('should show error message when clicking confirm and name is too long', async () => {
    const user = userEvent.setup();
    renderMakeCopyModal();

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
    renderMakeCopyModal();

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

  it('navigates to the correct url when the app is copied', async () => {
    const user = userEvent.setup();
    const mockNavigateToPackage = jest.fn();
    (PackagesRouter as jest.Mock).mockImplementation(() => ({
      navigateToPackage: mockNavigateToPackage,
    }));
    renderMakeCopyModal();

    const repoTextfield = screen.getByLabelText(textMock('general.service_name'));
    const newRepoValue: string = 'new-repo-name';
    await user.type(repoTextfield, newRepoValue);

    const copyButton = screen.getByRole('button', { name: textMock('dashboard.make_copy') });
    await user.click(copyButton);

    expect(mockNavigateToPackage).toHaveBeenCalled();
  });

  it('should show error message that app already exists when trying to copy an app with a name that already exists', async () => {
    const user = userEvent.setup();
    const copyRepoMock = jest
      .fn()
      .mockImplementation(() => Promise.reject({ response: { status: 409 } }));

    renderMakeCopyModal({}, {}, { copyApp: copyRepoMock });

    const repoTextfield = screen.getByLabelText(textMock('general.service_name'));
    const newRepoValue: string = 'new-repo-name';
    await user.type(repoTextfield, newRepoValue);

    const copyButton = screen.getByRole('button', { name: textMock('dashboard.make_copy') });
    await user.click(copyButton);

    expect(copyRepoMock).rejects.toEqual({ response: { status: 409 } });

    await screen.findByText(textMock('dashboard.app_already_exists'));
  });

  it('closes the modal when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderMakeCopyModal();

    const closeButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
