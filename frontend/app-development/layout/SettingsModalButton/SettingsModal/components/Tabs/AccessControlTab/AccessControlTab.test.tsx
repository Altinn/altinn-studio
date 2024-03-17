import React from 'react';
import {
  act,
  render as rtlRender,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import type { AccessControlTabProps } from './AccessControlTab';
import { AccessControlTab } from './AccessControlTab';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { mockAppMetadata } from '../../../mocks/applicationMetadataMock';
import userEvent from '@testing-library/user-event';

const mockApp: string = 'app';
const mockOrg: string = 'org';

jest.mock('../../../../../../hooks/mutations/useAppMetadataMutation');
const updateAppMetadataMutation = jest.fn();
const mockUpdateAppMetadataMutation = useAppMetadataMutation as jest.MockedFunction<
  typeof useAppMetadataMutation
>;
mockUpdateAppMetadataMutation.mockReturnValue({
  mutate: updateAppMetadataMutation,
} as unknown as UseMutationResult<void, Error, ApplicationMetadata, unknown>);

const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));

const defaultProps: AccessControlTabProps = {
  org: mockOrg,
  app: mockApp,
};

describe('AccessControlTab', () => {
  afterEach(jest.clearAllMocks);

  it('initially displays the spinner when loading data', () => {
    render();

    expect(screen.getByTitle(textMock('settings_modal.loading_content'))).toBeInTheDocument();
  });

  it('fetches appMetadata on mount', () => {
    render();
    expect(getAppMetadata).toHaveBeenCalledTimes(1);
  });

  it('shows an error message if an error occured on the getAppMetadata query', async () => {
    const errorMessage = 'error-message-test';
    render({}, { getAppMetadata: () => Promise.reject({ message: errorMessage }) });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders the header', async () => {
    render();
    const header = screen.getByRole('heading', {
      name: textMock('settings_modal.access_control_tab_heading'),
    });
    expect(header).toBeInTheDocument();
  });

  it('should render the button for help text.', async () => {
    render();
    const helpButton = screen.getByRole('button', {
      name: 'helptext',
    });
    expect(helpButton).toBeInTheDocument();
  });

  it('should render the text of the button for help text correctly', async () => {
    const user = userEvent.setup();
    render();
    const helpButton = screen.getByRole('button', { name: 'helptext' });
    expect(helpButton).toBeInTheDocument();
    await act(async () => {
      await user.click(helpButton);
    });
    const helpText = screen.getByText(
      textMock('settings_modal.access_control_tab_help_text_heading'),
    );
    expect(helpText).toBeInTheDocument();
  });

  it('renders the table', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('renders the column header for (Alle typer)', async () => {
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );
    const columnHeader = screen.getByRole('columnheader', {
      name: textMock('settings_modal.access_control_tab_option_all_type_partner'),
    });
    expect(columnHeader).toBeInTheDocument();
  });

  it('should update checkbox state for header checkbox', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();
    render();
    const headerCheckbox = screen.getByLabelText(
      textMock('settings_modal.access_control_tab_option_all_type_partner'),
    );
    expect(headerCheckbox).not.toBeChecked();
    await act(async () => {
      await user.click(headerCheckbox);
    });
    expect(headerCheckbox).toBeChecked();
    await act(async () => {
      await user.click(headerCheckbox);
    });
    expect(headerCheckbox).not.toBeChecked();
  });

  it('should render all checkboxes', async () => {
    getAppMetadata.mockImplementation(() => Promise.resolve(mockAppMetadata));
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    const bankruptcyEstateCheckbox = screen.getByRole('row', {
      name: textMock('settings_modal.access_control_tab_option_bankruptcy_estate'),
    });
    expect(bankruptcyEstateCheckbox).toBeInTheDocument();

    const organisationCheckbox = screen.getByRole('row', {
      name: textMock('settings_modal.access_control_tab_option_organisation'),
    });
    expect(organisationCheckbox).toBeInTheDocument();

    const personCheckbox = screen.getByRole('row', {
      name: textMock('settings_modal.access_control_tab_option_person'),
    });
    expect(personCheckbox).toBeInTheDocument();

    const subUnitCheckbox = screen.getByRole('row', {
      name: textMock('settings_modal.access_control_tab_option_sub_unit'),
    });
    expect(subUnitCheckbox).toBeInTheDocument();
  });

  it('should render all checkboxes as unchecked when applicationMetadata does not contain partyTypes allowed', async () => {
    getAppMetadata.mockImplementation(() =>
      Promise.resolve({ ...mockAppMetadata, partyTypesAllowed: null }),
    );
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes).toHaveLength(5);
    checkboxes.forEach((c) => expect(c).not.toBeChecked());
  });

  it("should set checkbox state for header checkbox to 'mixed(indetermind)' when some checkboxes are checked", async () => {
    getAppMetadata.mockImplementation(() =>
      Promise.resolve({
        ...mockAppMetadata,
        partyTypesAllowed: { ...mockAppMetadata.partyTypesAllowed },
      }),
    );
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    const checkboxes = screen.queryAllByRole('checkbox');
    await waitFor(async () => {
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[1]);
      await userEvent.click(checkboxes[2]);
    });
    const headerCheckbox = screen.getByLabelText(
      textMock('settings_modal.access_control_tab_option_all_type_partner'),
    );
    expect(headerCheckbox).toHaveAttribute('aria-checked', 'mixed');
  });

  it('should render all checkboxes as checked when applicationMetadata contains all partyTypes allowed', async () => {
    getAppMetadata.mockImplementation(() =>
      Promise.resolve({
        ...mockAppMetadata,
        partyTypesAllowed: { ...mockAppMetadata.partyTypesAllowed },
      }),
    );
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );
    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes).toHaveLength(5);
    checkboxes.forEach((c) => expect(c).toBeTruthy());
  });

  it('should render all checkboxes labels', async () => {
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    const bankruptcyEstateCheckbox = screen.getByRole('row', {
      name: textMock('settings_modal.access_control_tab_option_bankruptcy_estate'),
    });
    expect(bankruptcyEstateCheckbox).toBeInTheDocument();

    const organisationCheckbox = screen.getByRole('row', {
      name: textMock('settings_modal.access_control_tab_option_organisation'),
    });
    expect(organisationCheckbox).toBeInTheDocument();

    const personCheckbox = screen.getByRole('row', {
      name: textMock('settings_modal.access_control_tab_option_person'),
    });
    expect(personCheckbox).toBeInTheDocument();

    const subUnitCheckbox = screen.getByRole('row', {
      name: textMock('settings_modal.access_control_tab_option_sub_unit'),
    });
    expect(subUnitCheckbox).toBeInTheDocument();
  });

  it('renders the documentation link with the correct text', async () => {
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    const documentationLink = screen.getByText(
      textMock('settings_modal.access_control_tab_option_access_control_docs_link_text'),
    );
    expect(documentationLink).toBeInTheDocument();
  });

  it('renders the modal when user tries to uncheck the last checked checkbox, and close it when clicking on close button', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();
    render();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(async () => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(5);
      checkboxes.forEach((checkbox, index) => {
        if (index < 4) {
          user.click(checkbox);
        }
      });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const lastCheckbox = screen.getAllByRole('checkbox')[4];
    await act(async () => {
      await user.click(lastCheckbox);
    });
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    const modalMessage = screen.getByText(
      textMock('settings_modal.access_control_tab_option_choose_type_modal_message'),
    );
    expect(modalMessage).toBeInTheDocument();
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    expect(closeButton).toBeInTheDocument();
    await act(async () => {
      await user.click(closeButton);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

const resolveAndWaitForSpinnerToDisappear = async (props: Partial<AccessControlTabProps> = {}) => {
  getAppMetadata.mockImplementation(() => Promise.resolve(mockAppMetadata));
  render(props);
  await waitForElementToBeRemoved(() =>
    screen.queryByTitle(textMock('settings_modal.loading_content')),
  );
};

const render = (
  props: Partial<AccessControlTabProps> = {},
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    getAppMetadata,
    ...queries,
  };

  return rtlRender(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <AccessControlTab {...defaultProps} {...props} />
    </ServicesContextProvider>,
  );
};
