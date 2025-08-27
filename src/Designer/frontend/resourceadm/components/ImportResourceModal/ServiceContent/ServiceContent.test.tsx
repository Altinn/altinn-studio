import React from 'react';
import { render, screen, waitForElementToBeRemoved, waitFor } from '@testing-library/react';
import type { ServiceContentProps } from './ServiceContent';
import { ServiceContent } from './ServiceContent';
import type { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { mapAltinn2LinkServiceToSelectOption } from '../../../utils/mapperUtils';

const mockOrg: string = 'org';
const mockEnv: string = 'env1';

const mockAltinn2LinkService: Altinn2LinkService = {
  serviceOwnerCode: 'ttd',
  externalServiceCode: 'code1',
  externalServiceEditionCode: 'edition1',
  serviceName: 'TestService',
};
const mockAltinn2HyphenLinkService: Altinn2LinkService = {
  serviceOwnerCode: 'ttd',
  externalServiceCode: 'code2',
  externalServiceEditionCode: 'edition2',
  serviceName: 'test-med---hyphens',
};
const mockAltinn2LinkServices: Altinn2LinkService[] = [
  mockAltinn2LinkService,
  mockAltinn2HyphenLinkService,
];
const mockOption: string = mapAltinn2LinkServiceToSelectOption(mockAltinn2LinkService).label;
const mockHyphenOption: string = mapAltinn2LinkServiceToSelectOption(
  mockAltinn2HyphenLinkService,
).label;

const mockOnSelectService = jest.fn();

const defaultProps: ServiceContentProps = {
  org: mockOrg,
  env: mockEnv,
  selectedService: undefined,
  onSelectService: mockOnSelectService,
};

describe('ServiceContent', () => {
  afterEach(jest.clearAllMocks);

  it('initially displays the spinner when loading data', () => {
    renderServiceContent();

    expect(screen.getByTitle(textMock('resourceadm.import_resource_spinner'))).toBeInTheDocument();
  });

  it('fetches getAltinn2LinkServices on mount', () => {
    renderServiceContent();
    expect(queriesMock.getAltinn2LinkServices).toHaveBeenCalledTimes(1);
  });

  it('shows an error message if an error occured on the "getAltinn2LinkServices" query', async () => {
    const errorMessage = 'error-message-test';
    renderServiceContent(
      {},
      {
        getAltinn2LinkServices: () => Promise.reject({ message: errorMessage }),
      },
    );

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.import_resource_spinner')),
    );

    expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders empty list state correctly', async () => {
    renderServiceContent();

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.import_resource_spinner')),
    );

    const emptyListError = screen.getByText(
      textMock('resourceadm.import_resource_empty_list', { env: mockEnv }),
    );
    expect(emptyListError).toBeInTheDocument();
  });

  it('hides the resource name and id field when a service is not selected', async () => {
    await resolveAndWaitForSpinnerToDisappear({ selectedService: undefined });

    const select = screen.getAllByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_service'),
    )[0];
    expect(select).toBeInTheDocument();

    const resourceContent = screen.queryByLabelText(
      textMock('resourceadm.dashboard_resource_name_and_id_resource_name'),
    );
    expect(resourceContent).not.toBeInTheDocument();
  });

  it('handles service selection correctly', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    const select = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_service'),
    );
    await user.click(select);
    await user.click(screen.getByRole('option', { name: mockOption }));
    await waitFor(() => expect(select).toHaveValue(mockOption));

    expect(mockOnSelectService).toHaveBeenCalledWith(mockAltinn2LinkService);
  });

  it('handles service selection correctly when servicename contains hyphens', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    const select = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_service'),
    );
    await user.click(select);
    await user.click(screen.getByRole('option', { name: mockHyphenOption }));
    await waitFor(() => expect(select).toHaveValue(mockHyphenOption));

    expect(mockOnSelectService).toHaveBeenCalledWith(mockAltinn2HyphenLinkService);
  });
});

const resolveAndWaitForSpinnerToDisappear = async (props: Partial<ServiceContentProps> = {}) => {
  const getAltinn2LinkServices = jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockAltinn2LinkServices));

  renderServiceContent(props, { getAltinn2LinkServices });
  await waitForElementToBeRemoved(() =>
    screen.queryByTitle(textMock('resourceadm.import_resource_spinner')),
  );
};

const renderServiceContent = (
  props: Partial<ServiceContentProps> = {},
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return render(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <ServiceContent {...defaultProps} {...props} />
    </ServicesContextProvider>,
  );
};
