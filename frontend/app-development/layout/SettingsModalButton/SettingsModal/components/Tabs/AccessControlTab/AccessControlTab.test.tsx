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
import type { QueryClient } from '@tanstack/react-query';
import { mockAppMetadata } from '../../../mocks/applicationMetadataMock';
import userEvent from '@testing-library/user-event';

const mockApp: string = 'app';
const mockOrg: string = 'org';
const updateAppMetadataMock = jest.fn();

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
    render({ getAppMetadata: () => Promise.reject({ message: errorMessage }) });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders the header', () => {
    render();
    const header = screen.getByRole('heading', {
      name: textMock('settings_modal.access_control_tab_heading'),
    });
    expect(header).toBeInTheDocument();
  });

  it('renders the table', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    screen.getByRole('table');
  });

  it('should render all checkboxes', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    screen.getByRole('columnheader', {
      name: textMock('settings_modal.access_control_tab_option_all_types'),
    });
    screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_bankruptcy_estate'),
    });
    screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_organisation'),
    });
    screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_person'),
    });
    screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_sub_unit'),
    });
  });

  it('should render all checkboxes as checked when applicationMetadata contains all partyTypes allowed', async () => {
    const getAppMetadataMock = jest.fn().mockResolvedValue({
      ...mockAppMetadata,
      partyTypesAllowed: {
        bankruptcyEstate: true,
        organisation: true,
        person: true,
        subUnit: true,
      },
    });
    await resolveAndWaitForSpinnerToDisappear({ getAppMetadata: getAppMetadataMock });
    const checkboxes = screen.queryAllByRole('checkbox');
    checkboxes.forEach((c) => expect(c).toBeChecked());
  });

  it('should render the text of the button for help text correctly', async () => {
    const user = userEvent.setup();
    render();
    const helpButton = screen.getByRole('button', {
      name: textMock('settings_modal.access_control_tab_help_text_title'),
    });
    await act(() => user.click(helpButton));
    screen.getByText(textMock('settings_modal.access_control_tab_help_text_heading'));
  });

  it('renders the documentation link with the correct text', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    screen.getByText(
      textMock('settings_modal.access_control_tab_option_access_control_docs_link_text'),
    );
  });

  it('render the warning modal when user tries to uncheck all checkboxes', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();
    const checkbox = screen.getAllByRole('checkbox')[4];
    await act(() => user.click(checkbox));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(updateAppMetadataMock).not.toHaveBeenCalled();
  });

  it('render the warning modal when user tries to uncheck all checkboxes, and close it', async () => {
    const user = userEvent.setup();
    const getAppMetadataMock = jest.fn().mockResolvedValue({
      ...mockAppMetadata,
      partyTypesAllowed: {
        person: false,
        organisation: false,
        subUnit: false,
        bankruptcyEstate: true,
      },
    });
    await resolveAndWaitForSpinnerToDisappear({ getAppMetadata: getAppMetadataMock });
    const bankruptcyEstateCheckbox = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_bankruptcy_estate'),
    });
    expect(bankruptcyEstateCheckbox).toBeChecked();
    await waitFor(() => user.click(bankruptcyEstateCheckbox));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(updateAppMetadataMock).not.toHaveBeenCalled();
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await act(() => user.click(closeButton));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call updateAppMetadataMutation when selecting checkbox', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();
    const checkboxes = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_person'),
    });
    await act(() => user.click(checkboxes));
    expect(updateAppMetadataMock).toHaveBeenCalledTimes(1);
  });
});

const resolveAndWaitForSpinnerToDisappear = async (queries: Partial<ServicesContextProps> = {}) => {
  getAppMetadata.mockImplementation(() => Promise.resolve(mockAppMetadata));
  render(queries);
  await waitForElementToBeRemoved(() =>
    screen.queryByTitle(textMock('settings_modal.loading_content')),
  );
};

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    getAppMetadata,
    updateAppMetadata: updateAppMetadataMock,
    ...queries,
  };

  return rtlRender(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <AccessControlTab {...defaultProps}></AccessControlTab>
    </ServicesContextProvider>,
  );
};
