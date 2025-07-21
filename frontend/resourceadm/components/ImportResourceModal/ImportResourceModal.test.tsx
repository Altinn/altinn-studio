import React, { useRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import type { ImportResourceModalProps } from './ImportResourceModal';
import { ImportResourceModal } from './ImportResourceModal';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { MemoryRouter } from 'react-router-dom';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { mapAltinn2LinkServiceToSelectOption } from '../../utils/mapperUtils';

const mockButtonText: string = 'Mock Button';
const mockAltinn2LinkService: Altinn2LinkService = {
  serviceOwnerCode: 'ttd',
  externalServiceCode: 'code1',
  externalServiceEditionCode: 'edition1',
  serviceName: 'TestService',
};
const mockAltinn2LinkServices: Altinn2LinkService[] = [mockAltinn2LinkService];
const mockOption: string = mapAltinn2LinkServiceToSelectOption(mockAltinn2LinkService).label;

const mockOnClose = jest.fn();
const getAltinn2LinkServices = jest
  .fn()
  .mockImplementation(() => Promise.resolve(mockAltinn2LinkServices));

const defaultProps: ImportResourceModalProps = {
  onClose: mockOnClose,
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org: 'ttd',
  }),
}));

describe('ImportResourceModal', () => {
  afterEach(jest.clearAllMocks);

  it('selects environment and service, then checks if import button is enabled', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    const importButtonText = textMock('resourceadm.dashboard_import_modal_import_button');
    const importButton = screen.queryByRole('button', { name: importButtonText });
    expect(importButton).toHaveAttribute('aria-disabled', 'true');

    const environmentSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_env'),
    );
    await user.click(environmentSelect);
    await user.click(screen.getByRole('option', { name: textMock('resourceadm.deploy_at22_env') }));

    await waitFor(() =>
      expect(environmentSelect).toHaveValue(textMock('resourceadm.deploy_at22_env')),
    );
    expect(importButton).toHaveAttribute('aria-disabled', 'true');

    // wait for the second combobox to appear, instead of waiting for the spinner to disappear.
    // (sometimes the spinner disappears) too quick and the test will fail
    await waitFor(() => {
      expect(
        screen.getByLabelText(textMock('resourceadm.dashboard_import_modal_select_service')),
      ).toBeInTheDocument();
    });

    const serviceSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_service'),
    );
    await user.click(serviceSelect);
    await user.click(screen.getByRole('option', { name: mockOption }));

    await waitFor(() => expect(serviceSelect).toHaveValue(mockOption));
    expect(screen.getByRole('button', { name: importButtonText })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('should not import resource if some information is missing', async () => {
    const user = userEvent.setup();
    const importResourceFromAltinn2 = jest.fn();
    await renderAndOpenModal(user, { importResourceFromAltinn2 });

    const importButton = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_import_modal_import_button'),
    });

    await user.click(importButton);
    expect(importResourceFromAltinn2).not.toHaveBeenCalled();
  });

  it('should clear service field when environment is changed', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    const environmentSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_env'),
    );
    await user.click(environmentSelect);
    await user.click(screen.getByRole('option', { name: textMock('resourceadm.deploy_at22_env') }));

    // wait for the second combobox to appear, instead of waiting for the spinner to disappear.
    // (sometimes the spinner disappears) too quick and the test will fail
    await waitFor(() => {
      expect(
        screen.getByLabelText(textMock('resourceadm.dashboard_import_modal_select_service')),
      ).toBeInTheDocument();
    });

    const serviceSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_service'),
    );
    await user.click(serviceSelect);
    await user.click(screen.getByRole('option', { name: mockOption }));
    await waitFor(() => expect(serviceSelect).toHaveValue(mockOption));

    await user.click(environmentSelect);
    await user.click(screen.getByRole('option', { name: textMock('resourceadm.deploy_at22_env') }));
    await waitFor(() =>
      expect(
        screen.queryByLabelText(textMock('resourceadm.dashboard_resource_name_and_id_resource_id')),
      ).not.toBeInTheDocument(),
    );
  });

  it('should clear id field when service is changed', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    const environmentSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_env'),
    );
    await user.click(environmentSelect);
    await user.click(screen.getByRole('option', { name: textMock('resourceadm.deploy_at22_env') }));

    // wait for the second combobox to appear, instead of waiting for the spinner to disappear.
    // (sometimes the spinner disappears) too quick and the test will fail
    await waitFor(() => {
      expect(
        screen.getByLabelText(textMock('resourceadm.dashboard_import_modal_select_service')),
      ).toBeInTheDocument();
    });

    const serviceSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_service'),
    );
    await user.click(serviceSelect);
    await user.click(screen.getByRole('option', { name: mockOption }));
    await waitFor(() => expect(serviceSelect).toHaveValue(mockOption));

    await user.click(serviceSelect);
    await user.keyboard('{BACKSPACE}');

    await waitFor(() => {
      expect(
        screen.queryByLabelText(textMock('resourceadm.dashboard_resource_name_and_id_resource_id')),
      ).not.toBeInTheDocument();
    });
  });

  it('calls onClose function when close button is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    const closeButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls import resource from Altinn 2 when import is clicked', async () => {
    const user = userEvent.setup();
    const importResourceFromAltinn2 = jest.fn();
    await renderAndOpenModal(user, { importResourceFromAltinn2 });

    const environmentSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_env'),
    );
    await user.click(environmentSelect);
    await user.click(screen.getByRole('option', { name: textMock('resourceadm.deploy_at22_env') }));

    // wait for the second combobox to appear, instead of waiting for the spinner to disappear.
    // (sometimes the spinner disappears) too quick and the test will fail
    await waitFor(() => {
      expect(
        screen.getByLabelText(textMock('resourceadm.dashboard_import_modal_select_service')),
      ).toBeInTheDocument();
    });

    const serviceSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_service'),
    );
    await user.click(serviceSelect);
    await user.click(screen.getByRole('option', { name: mockOption }));

    const importButton = await screen.findByRole('button', {
      name: textMock('resourceadm.dashboard_import_modal_import_button'),
    });
    await user.click(importButton);

    expect(importResourceFromAltinn2).toHaveBeenCalledTimes(1);
  });

  it('formats id when id field is changed', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    const environmentSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_env'),
    );
    await user.click(environmentSelect);
    await user.click(screen.getByRole('option', { name: textMock('resourceadm.deploy_at22_env') }));

    // wait for the second combobox to appear, instead of waiting for the spinner to disappear.
    // (sometimes the spinner disappears) too quick and the test will fail
    await waitFor(() => {
      expect(
        screen.getByLabelText(textMock('resourceadm.dashboard_import_modal_select_service')),
      ).toBeInTheDocument();
    });

    const serviceSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_service'),
    );
    await user.click(serviceSelect);
    await user.click(screen.getByRole('option', { name: mockOption }));

    const idField = await screen.findByLabelText(
      textMock('resourceadm.dashboard_resource_name_and_id_resource_id'),
    );
    await user.type(idField, '?/test');

    expect(idField).toHaveValue(`${mockAltinn2LinkService.serviceName.toLowerCase()}--test`);
  });

  it('displays error message when resource identifier starts with _app', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    const environmentSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_env'),
    );
    await user.click(environmentSelect);
    await user.click(screen.getByRole('option', { name: textMock('resourceadm.deploy_at22_env') }));

    // wait for the second combobox to appear, instead of waiting for the spinner to disappear.
    // (sometimes the spinner disappears) too quick and the test will fail
    await waitFor(() => {
      expect(
        screen.getByLabelText(textMock('resourceadm.dashboard_import_modal_select_service')),
      ).toBeInTheDocument();
    });

    const serviceSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_service'),
    );
    await user.click(serviceSelect);
    await user.click(screen.getByRole('option', { name: mockOption }));

    const idField = await screen.findByLabelText(
      textMock('resourceadm.dashboard_resource_name_and_id_resource_id'),
    );
    await user.clear(idField);
    await user.type(idField, 'app_');

    expect(
      screen.getByText(textMock('resourceadm.dashboard_resource_id_cannot_be_app')),
    ).toBeInTheDocument();
  });

  it('displays conflict message if identifier is in use', async () => {
    const user = userEvent.setup();
    const importResourceFromAltinn2 = jest
      .fn()
      .mockImplementation(() => Promise.reject({ response: { status: ServerCodes.Conflict } }));

    await renderAndOpenModal(user, { importResourceFromAltinn2 });

    const environmentSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_env'),
    );
    await user.click(environmentSelect);
    await user.click(screen.getByRole('option', { name: textMock('resourceadm.deploy_at22_env') }));

    // wait for the second combobox to appear, instead of waiting for the spinner to disappear.
    // (sometimes the spinner disappears) too quick and the test will fail
    await waitFor(() => {
      expect(
        screen.getByLabelText(textMock('resourceadm.dashboard_import_modal_select_service')),
      ).toBeInTheDocument();
    });

    const serviceSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_service'),
    );
    await user.click(serviceSelect);
    await user.click(screen.getByRole('option', { name: mockOption }));

    const importButton = await screen.findByRole('button', {
      name: textMock('resourceadm.dashboard_import_modal_import_button'),
    });
    await user.click(importButton);

    await waitFor(() => {
      expect(
        screen.getByText(textMock('resourceadm.dashboard_resource_name_and_id_error')),
      ).toBeInTheDocument();
    });
  });
});

const renderImportResourceModal = (queries: Partial<ServicesContextProps> = {}) => {
  const allQueries: Partial<ServicesContextProps> = {
    getAltinn2LinkServices,
  };

  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} {...queries} client={createQueryClientMock()}>
        <TestComponentWithButton />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

const renderAndOpenModal = async (
  user: UserEvent,
  queryMocks: Partial<ServicesContextProps> = {},
) => {
  renderImportResourceModal(queryMocks);

  const openModalButton = screen.getByRole('button', { name: mockButtonText });
  await user.click(openModalButton);
};

const TestComponentWithButton = () => {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button onClick={() => modalRef.current?.showModal()}>{mockButtonText}</button>
      <ImportResourceModal ref={modalRef} {...defaultProps} />
    </>
  );
};
