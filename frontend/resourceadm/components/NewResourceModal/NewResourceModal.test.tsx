import React, { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NewResourceModalProps } from './NewResourceModal';
import { NewResourceModal } from './NewResourceModal';
import { act } from 'react-dom/test-utils'; // Import act if needed
import { textMock } from '../../../testing/mocks/i18nMock';
import { MemoryRouter } from 'react-router-dom';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

const mockButtonText: string = 'Mock Button';
const org = 'orgname';

const mockOnClose = jest.fn();

const defaultProps: NewResourceModalProps = {
  onClose: mockOnClose,
};

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
  useParams: () => {
    return { selectedContext: org };
  },
}));

describe('NewResourceModal', () => {
  afterEach(jest.clearAllMocks);

  it('should be closed by default', () => {
    renderNewResourceModal();
    const closeButton = screen.queryByRole('button', { name: textMock('general.cancel') });
    expect(closeButton).not.toBeInTheDocument();
  });

  it('calls onClose function when close button is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    const closeButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('that create button should be disabled until the form is valid', async () => {
    await renderAndOpenModal();

    const createButton = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_create_modal_create_button'),
    });
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
  });

  test('that create button should not create new resource when input fields are empty', async () => {
    const user = userEvent.setup();
    const createResourceMock = jest.fn();
    await renderAndOpenModal({ createResource: createResourceMock });

    const createButton = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_create_modal_create_button'),
    });
    await act(() => user.click(createButton));
    expect(createResourceMock).not.toHaveBeenCalled();
  });

  test('that create button should be enabled when the form is valid', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    const titleInput = screen.getByLabelText(
      textMock('resourceadm.dashboard_resource_name_and_id_resource_name'),
    );
    await act(() => user.type(titleInput, 'test'));

    const createButton = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_create_modal_create_button'),
    });
    expect(createButton).toHaveAttribute('aria-disabled', 'false');
  });

  test('should navigate after creating new resource', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    const titleInput = screen.getByLabelText(
      textMock('resourceadm.dashboard_resource_name_and_id_resource_name'),
    );
    await act(() => user.type(titleInput, 'test'));

    const createButton = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_create_modal_create_button'),
    });

    await act(() => user.click(createButton));
    expect(mockedNavigate).toHaveBeenCalledWith(`/${org}/${org}-resources/resource/test/about`);
  });

  test('should show error message if resource id is already in use', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal({
      createResource: jest
        .fn()
        .mockImplementation(() => Promise.reject({ response: { status: ServerCodes.Conflict } })),
    });

    const titleInput = screen.getByLabelText(
      textMock('resourceadm.dashboard_resource_name_and_id_resource_name'),
    );
    await act(() => user.type(titleInput, 'test'));

    const createButton = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_create_modal_create_button'),
    });
    await act(() => user.click(createButton));

    expect(
      screen.getByText(textMock('resourceadm.dashboard_resource_name_and_id_error')),
    ).toBeInTheDocument();
  });
});

const renderNewResourceModal = (queries: Partial<ServicesContextProps> = {}) => {
  const allQueries = {
    ...queriesMock,
    ...queries,
  };
  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <TestComponentWithButton {...defaultProps} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

const renderAndOpenModal = async (queries: Partial<ServicesContextProps> = {}) => {
  const user = userEvent.setup();
  renderNewResourceModal(queries);

  const openModalButton = screen.getByRole('button', { name: mockButtonText });
  await act(() => user.click(openModalButton));
};

const TestComponentWithButton = (props: Partial<NewResourceModalProps> = {}) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button onClick={() => modalRef.current?.showModal()}>{mockButtonText}</button>
      <NewResourceModal ref={modalRef} {...defaultProps} {...props} />
    </>
  );
};
