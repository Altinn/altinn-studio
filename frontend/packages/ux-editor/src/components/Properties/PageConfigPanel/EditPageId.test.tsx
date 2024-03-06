import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { formLayoutSettingsMock, renderWithProviders } from '../../../testing/mocks';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { EditPageId } from './EditPageId';
import { queriesMock } from 'app-shared/mocks/queriesMock';

// Test data
const app = 'app';
const org = 'org';
const selectedLayout = 'layoutPageName';
const layoutSetName = 'test-layout-set';

describe('EditPageId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders given page ID', () => {
    renderEditPageId();
    screen.getByRole('button', { name: `ID: ${selectedLayout}` });
  });

  it('calls updateFormLayoutName and textIdMutation with new page ID when changed', async () => {
    const user = userEvent.setup();
    const newPageName = 'myNewPageName';
    renderEditPageId();
    const pageIdButton = screen.getByRole('button', { name: `ID: ${selectedLayout}` });
    await act(() => user.click(pageIdButton));
    const editPageId = screen.getByLabelText(
      textMock('ux_editor.modal_properties_textResourceBindings_page_id'),
    );
    await act(() => user.clear(editPageId));
    await act(() => user.type(editPageId, newPageName));
    fireEvent.blur(editPageId);
    await waitFor(() => expect(queriesMock.updateFormLayoutName).toHaveBeenCalledTimes(1));
    expect(queriesMock.updateFormLayoutName).toHaveBeenCalledWith(
      org,
      app,
      selectedLayout,
      newPageName,
      layoutSetName,
    );
    expect(queriesMock.updateTextId).toHaveBeenCalledTimes(1);
  });

  it('does not call updateFormLayoutName and textIdMutation when page ID is unchanged', async () => {
    const user = userEvent.setup();
    renderEditPageId();
    const pageIdButton = screen.getByRole('button', { name: `ID: ${selectedLayout}` });
    await act(() => user.click(pageIdButton));
    const editPageId = screen.getByLabelText(
      textMock('ux_editor.modal_properties_textResourceBindings_page_id'),
    );
    fireEvent.blur(editPageId);
    await waitFor(() => expect(queriesMock.updateFormLayoutName).toHaveBeenCalledTimes(0));
    expect(queriesMock.updateTextId).toHaveBeenCalledTimes(0);
  });

  it('renders error message if page ID exist in layout settings order', async () => {
    const user = userEvent.setup();
    const existingPageName = 'Side1'; // exists in layoutSettingsMock
    renderEditPageId();
    const notUniqueErrorMessage = screen.queryByText(textMock('ux_editor.pages_error_unique'));
    expect(notUniqueErrorMessage).not.toBeInTheDocument();
    const pageIdButton = screen.getByRole('button', { name: `ID: ${selectedLayout}` });
    await act(() => user.click(pageIdButton));
    const editPageId = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_textResourceBindings_page_id'),
    });
    await act(() => user.clear(editPageId));
    await act(() => user.type(editPageId, existingPageName));
    screen.getByText(textMock('ux_editor.pages_error_unique'));
  });
});

const renderEditPageId = () => {
  queryClientMock.setQueryData(
    [QueryKey.FormLayoutSettings, org, app, layoutSetName],
    formLayoutSettingsMock,
  );
  return renderWithProviders(<EditPageId layoutName={selectedLayout} />);
};
