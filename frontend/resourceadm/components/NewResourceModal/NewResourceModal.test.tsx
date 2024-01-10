import React, { useRef } from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent, { UserEvent } from '@testing-library/user-event';
import { NewResourceModal, NewResourceModalProps } from './NewResourceModal';
import { act } from 'react-dom/test-utils'; // Import act if needed
import { textMock } from '../../../testing/mocks/i18nMock';
import { MemoryRouter } from 'react-router-dom';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
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
    render();
    const closeButton = screen.queryByRole('button', { name: textMock('general.cancel') });
    expect(closeButton).not.toBeInTheDocument();
  });

  it('calls onClose function when close button is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    const closeButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('that create button should be disabled until the form is valid', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    const createButton = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_create_modal_create_button'),
    });
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
  });

  test('that create button should be enabled when the form is valid', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

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
    await renderAndOpenModal(user);

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
    await renderAndOpenModal(user, {
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

const render = (queries: Partial<ServicesContextProps> = {}) => {
  const allQueries = {
    ...queriesMock,
    ...queries,
  };
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <TestComponentWithButton {...defaultProps} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

const renderAndOpenModal = async (user: UserEvent, queries: Partial<ServicesContextProps> = {}) => {
  render(queries);

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
