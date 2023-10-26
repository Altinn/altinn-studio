import React from 'react';
import { render as rtlRender, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportResourceModal, ImportResourceModalProps } from './ImportResourceModal';
import { textMock } from '../../../testing/mocks/i18nMock';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { useImportResourceFromAltinn2Mutation } from 'resourceadm/hooks/mutations';
import { UseMutationResult } from '@tanstack/react-query';
import { Resource } from 'app-shared/types/ResourceAdm';

const mockAltinn2LinkService: Altinn2LinkService = {
  externalServiceCode: 'code1',
  externalServiceEditionCode: 'edition1',
  serviceName: 'TestService',
};
const mockAltinn2LinkServices: Altinn2LinkService[] = [mockAltinn2LinkService];
const mockOption: string = `${mockAltinn2LinkService.externalServiceCode}-${mockAltinn2LinkService.externalServiceEditionCode}-${mockAltinn2LinkService.serviceName}`;

const mockOnClose = jest.fn();
const getAltinn2LinkServices = jest.fn().mockImplementation(() => Promise.resolve({}));

jest.mock('../../hooks/mutations/useImportResourceFromAltinn2Mutation');
const importResourceFromAltinn2 = jest.fn();
const mockImportResourceFromAltinn2 = useImportResourceFromAltinn2Mutation as jest.MockedFunction<
  typeof useImportResourceFromAltinn2Mutation
>;
mockImportResourceFromAltinn2.mockReturnValue({
  mutate: importResourceFromAltinn2,
} as unknown as UseMutationResult<
  Resource,
  unknown,
  {
    environment: string;
    serviceCode: string;
    serviceEdition: string;
  },
  unknown
>);

const defaultProps: ImportResourceModalProps = {
  isOpen: true,
  onClose: mockOnClose,
};

describe('ImportResourceModal', () => {
  afterEach(jest.clearAllMocks);

  it('selects environment and service, then checks if import button exists', async () => {
    const user = userEvent.setup();
    render();

    const importButtonText = textMock('resourceadm.dashboard_import_modal_import_button');
    const importButton = screen.queryByRole('button', { name: importButtonText });
    expect(importButton).not.toBeInTheDocument();

    const [, environmentSelect] = screen.getAllByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_env'),
    );
    await act(() => user.click(environmentSelect));
    await act(() => user.click(screen.getByRole('option', { name: 'AT21' })));

    expect(environmentSelect).toHaveValue('AT21');
    expect(importButton).not.toBeInTheDocument();

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.import_resource_spinner')),
    );

    const [, serviceSelect] = screen.getAllByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_service'),
    );
    await act(() => user.click(serviceSelect));
    await act(() => user.click(screen.getByRole('option', { name: mockOption })));

    expect(serviceSelect).toHaveValue(mockOption);
    expect(screen.getByRole('button', { name: importButtonText })).toBeInTheDocument();
  });

  it('calls onClose function when close button is clicked', async () => {
    const user = userEvent.setup();
    render();

    const closeButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should be closed by default', () => {
    render({ isOpen: false });

    const closeButton = screen.queryByRole('button', { name: textMock('general.cancel') });
    expect(closeButton).not.toBeInTheDocument();
  });

  it('calls import resource from Altinn 2 when import is clicked', async () => {
    const user = userEvent.setup();
    render();

    const [, environmentSelect] = screen.getAllByLabelText(
      textMock('resourceadm.dashboard_import_modal_select_env'),
    );
    await act(() => user.click(environmentSelect));
    await act(() => user.click(screen.getByRole('option', { name: 'AT21' })));
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.import_resource_spinner')),
    );
    const [, serviceSelect] = screen.getAllByLabelText(
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
});

const render = (props: Partial<ImportResourceModalProps> = {}) => {
  getAltinn2LinkServices.mockImplementation(() => Promise.resolve(mockAltinn2LinkServices));

  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getAltinn2LinkServices,
  };

  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <ImportResourceModal {...defaultProps} {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
