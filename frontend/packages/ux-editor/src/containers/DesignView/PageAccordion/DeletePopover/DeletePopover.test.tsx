import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import { DeletePopover, DeletePopoverProps } from './DeletePopover';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import {
  queriesMock,
  renderHookWithMockStore,
  renderWithMockStore,
} from '../../../../testing/mocks';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';
import { formDesignerMock } from '../../../../testing/stateMocks';
import { layout1NameMock, layout2NameMock } from '../../../../testing/layoutMock';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const deleteFormLayout = jest.fn().mockImplementation(() => Promise.resolve({}));

const mockOrg = 'org';
const mockApp = 'app';
const mockPageName1: string = formDesignerMock.layout.selectedLayout;
const mockSelectedLayoutSet = 'test-layout-set';
const mockPageName2 = layout2NameMock;

const mockSetSearchParams = jest.fn();
const mockSearchParams = { layout: mockPageName1 };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org: mockOrg,
    app: mockApp,
  }),
  useSearchParams: () => {
    return [new URLSearchParams(mockSearchParams), mockSetSearchParams];
  },
}));

const defaultProps: DeletePopoverProps = {
  pageName: layout1NameMock,
};

describe('DeleteModal', () => {
  afterEach(jest.clearAllMocks);

  it('does not show the modal by default when not open', async () => {
    await render();

    const deleteButton = screen.queryByRole('button', {
      name: textMock('ux_editor.page_delete_confirm'),
    });
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('opens the modal when the button is clicked', async () => {
    await render();

    const deleteButton = screen.queryByRole('button', {
      name: textMock('ux_editor.page_delete_confirm'),
    });
    expect(deleteButton).not.toBeInTheDocument();

    await openDeletePopover();

    const deleteButtonAfter = screen.getByRole('button', {
      name: textMock('ux_editor.page_delete_confirm'),
    });
    expect(deleteButtonAfter).toBeInTheDocument();
  });

  it('calls "onDelete" when delete button is clicked', async () => {
    const user = userEvent.setup();
    await render();
    await openDeletePopover();

    const deleteButton = screen.getByRole('button', {
      name: textMock('ux_editor.page_delete_confirm'),
    });
    await act(() => user.click(deleteButton));

    expect(deleteFormLayout).toHaveBeenCalledTimes(1);
  });

  it('should update the url to new page when deleting selected page', async () => {
    const user = userEvent.setup();
    await render();
    await openDeletePopover();

    const deleteButton = screen.getByRole('button', {
      name: textMock('ux_editor.page_delete_confirm'),
    });
    await act(() => user.click(deleteButton));

    expect(deleteFormLayout).toHaveBeenCalledTimes(1);
    expect(mockSetSearchParams).toHaveBeenCalledWith({ layout: mockPageName2 });
  });
});

const openDeletePopover = async () => {
  const user = userEvent.setup();
  const dropdownMenuItem = screen.getByRole('button', {
    name: textMock('general.delete'),
  });
  await act(() => user.click(dropdownMenuItem));
};

const waitForData = async () => {
  const settingsResult = renderHookWithMockStore()(() =>
    useFormLayoutSettingsQuery(mockOrg, mockApp, mockSelectedLayoutSet),
  ).renderHookResult.result;

  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<DeletePopoverProps> = {}) => {
  await waitForData();

  const allQueries: ServicesContextProps = {
    ...queriesMock,
    deleteFormLayout,
  };

  return renderWithMockStore({}, allQueries)(<DeletePopover {...defaultProps} {...props} />);
};
