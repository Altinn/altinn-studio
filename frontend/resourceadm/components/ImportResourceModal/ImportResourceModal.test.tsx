import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportResourceModal, ImportResourceModalProps } from './ImportResourceModal';
import { textMock } from '../../../testing/mocks/i18nMock';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';

const mockAltinn2LinkService: Altinn2LinkService = {
  externalServiceCode: 'code1',
  externalServiceEditionCode: 'edition1',
  serviceName: 'TestService',
};
const mockAltinn2LinkServices: Altinn2LinkService[] = [mockAltinn2LinkService];
const mockOption: string = `${mockAltinn2LinkService.externalServiceCode}-${mockAltinn2LinkService.externalServiceEditionCode}-${mockAltinn2LinkService.serviceName}`;

const mockOnClose = jest.fn();
const importResourceFromAltinn2 = jest.fn();
const getAltinn2LinkServices = jest
  .fn()
  .mockImplementation(() => Promise.resolve(mockAltinn2LinkServices));

const defaultProps: ImportResourceModalProps = {
  isOpen: true,
  onClose: mockOnClose,
};

describe('ImportResourceModal', () => {
  afterEach(jest.clearAllMocks);

  it('selects environment and service, then checks if import button is enabled', async () => {
    const user = userEvent.setup();
    renderImportResourceModal();

    const importButtonText = textMock('resourceadm.dashboard_import_modal_import_button');
    const importButton = screen.queryByRole('button', { name: importButtonText });
    expect(importButton).toBeDisabled();

    const environmentSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_env'),
    );
    await act(() => user.click(environmentSelect));
    await act(() => user.click(screen.getByRole('option', { name: 'AT21' })));

    expect(environmentSelect).toHaveValue('AT21');
    expect(importButton).toBeDisabled();

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
    await act(() => user.click(serviceSelect));
    await act(() => user.click(screen.getByRole('option', { name: mockOption })));

    expect(serviceSelect).toHaveValue(mockOption);
    expect(screen.getByRole('button', { name: importButtonText })).not.toBeDisabled();
  });

  it('calls onClose function when close button is clicked', async () => {
    const user = userEvent.setup();
    renderImportResourceModal();

    const closeButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should be closed by default', () => {
    renderImportResourceModal({ isOpen: false });

    const closeButton = screen.queryByRole('button', { name: textMock('general.cancel') });
    expect(closeButton).not.toBeInTheDocument();
  });

  it('calls import resource from Altinn 2 when import is clicked', async () => {
    const user = userEvent.setup();
    renderImportResourceModal();

    const environmentSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_env'),
    );
    await act(() => user.click(environmentSelect));
    await act(() => user.click(screen.getByRole('option', { name: 'AT21' })));

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
    await act(() => user.click(serviceSelect));
    await act(() => user.click(screen.getByRole('option', { name: mockOption })));

    const importButton = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_import_modal_import_button'),
    });
    await act(() => user.click(importButton));

    expect(importResourceFromAltinn2).toHaveBeenCalledTimes(1);
  });

  it('formats id when id field is changed', async () => {
    const user = userEvent.setup();
    renderImportResourceModal();

    const environmentSelect = screen.getByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_env'),
    );
    await act(() => user.click(environmentSelect));
    await act(() => user.click(screen.getByRole('option', { name: 'AT21' })));

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
    await act(() => user.click(serviceSelect));
    await act(() => user.click(screen.getByRole('option', { name: mockOption })));

    const idField = screen.getByLabelText(
      textMock('resourceadm.dashboard_resource_name_and_id_resource_id'),
    );
    await act(() => user.type(idField, '?/test'));

    expect(idField).toHaveValue(`${mockAltinn2LinkService.serviceName}--test`);
  });
});

const renderImportResourceModal = (props: Partial<ImportResourceModalProps> = {}) => {
  const allQueries: Partial<ServicesContextProps> = {
    getAltinn2LinkServices,
    importResourceFromAltinn2,
  };

  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <ImportResourceModal {...defaultProps} {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
