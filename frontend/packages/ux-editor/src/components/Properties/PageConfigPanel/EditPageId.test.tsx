import React from 'react';
import { screen } from '@testing-library/react';
import { formLayoutSettingsMock, renderWithProviders } from '../../../testing/mocks';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { EditPageId } from './EditPageId';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import {
  groupsPagesModelMock,
  layout1NameMock,
  layout2NameMock,
  pagesModelMock,
} from '../../../testing/layoutMock';
import { layoutSet1NameMock } from '../../../testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';
import type { ILayoutSettings } from 'app-shared/types/global';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';

// Test data
const selectedLayout = layout2NameMock;
const layoutSetName = layoutSet1NameMock;

describe('EditPageId', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders given page ID', () => {
    renderEditPageId({});
    screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_textResourceBindings_page_id'),
    });
  });

  it('calls updateFormLayoutName and textIdMutation with new page ID when changed', async () => {
    const user = userEvent.setup();
    const newPageName = 'myNewPageName';
    const updateTextId = jest.fn();
    const modifyPage = jest.fn().mockImplementation(() => Promise.resolve());
    const mockQueries: Partial<ServicesContextProps> = {
      updateTextId,
      modifyPage,
    };
    renderEditPageId({ queries: mockQueries });
    const pageIdButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_textResourceBindings_page_id'),
    });
    await user.click(pageIdButton);
    const editPageId = screen.getByLabelText(
      textMock('ux_editor.modal_properties_textResourceBindings_page_id'),
    );
    await user.clear(editPageId);
    await user.type(editPageId, newPageName);
    await user.tab();
    expect(modifyPage).toHaveBeenCalledTimes(1);
    expect(modifyPage).toHaveBeenCalledWith(org, app, layoutSetName, selectedLayout, {
      id: newPageName,
    });
    expect(updateTextId).toHaveBeenCalledTimes(1);
  });

  it('does not call updateFormLayoutName and textIdMutation when page ID is unchanged', async () => {
    const user = userEvent.setup();
    const updateTextId = jest.fn();
    const updateFormLayoutName = jest.fn();
    const mockQueries: Partial<ServicesContextProps> = {
      updateTextId,
      updateFormLayoutName,
    };
    renderEditPageId({ queries: mockQueries });
    const pageIdButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_textResourceBindings_page_id'),
    });
    await user.click(pageIdButton);
    const editPageId = screen.getByLabelText(
      textMock('ux_editor.modal_properties_textResourceBindings_page_id'),
    );
    await user.click(editPageId);
    await user.tab();
    expect(updateFormLayoutName).not.toHaveBeenCalled();
    expect(updateTextId).toHaveBeenCalledTimes(0);
  });

  it('renders error message if page ID exist in layout settings order', async () => {
    const user = userEvent.setup();
    const existingPageName = layout1NameMock;
    renderEditPageId({});
    const notUniqueErrorMessage = screen.queryByText(textMock('ux_editor.pages_error_unique'));
    expect(notUniqueErrorMessage).not.toBeInTheDocument();
    const pageIdButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_textResourceBindings_page_id'),
    });
    await user.click(pageIdButton);
    const editPageId = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_textResourceBindings_page_id'),
    });
    await user.clear(editPageId);
    await user.type(editPageId, existingPageName);
    screen.getByText(textMock('ux_editor.pages_error_unique'));
  });

  it('calls pageGroup mutation when changing pages in a group', async () => {
    const user = userEvent.setup();
    const newPageName = 'myNewPageName';
    const changePageGroups = jest.fn().mockImplementation(() => Promise.resolve());
    const modifyPage = jest.fn().mockImplementation(() => Promise.resolve());
    renderEditPageId({
      pagesMock: groupsPagesModelMock,
      queries: { changePageGroups, modifyPage },
    });
    await user.click(pageIdButton());
    await user.clear(pageIdTextbox());
    await user.type(pageIdTextbox(), newPageName);
    await user.tab();
    expect(changePageGroups).toHaveBeenCalledTimes(1);
    expect(modifyPage).toHaveBeenCalledTimes(0);
  });

  it('calls pageOrder mutation when changing pages without a group', async () => {
    const user = userEvent.setup();
    const newPageName = 'myNewPageName';
    const changePageGroups = jest.fn().mockImplementation(() => Promise.resolve());
    const modifyPage = jest.fn().mockImplementation(() => Promise.resolve());
    renderEditPageId({ queries: { changePageGroups, modifyPage } });
    await user.click(pageIdButton());
    await user.clear(pageIdTextbox());
    await user.type(pageIdTextbox(), newPageName);
    await user.tab();
    expect(modifyPage).toHaveBeenCalledTimes(1);
    expect(changePageGroups).toHaveBeenCalledTimes(0);
  });
});

const pageIdButton = () =>
  screen.getByRole('button', {
    name: textMock('ux_editor.modal_properties_textResourceBindings_page_id'),
  });

const pageIdTextbox = () =>
  screen.getByRole('textbox', {
    name: textMock('ux_editor.modal_properties_textResourceBindings_page_id'),
  });

type renderEditPageIdParams = {
  layoutSettingsMock?: ILayoutSettings;
  pagesMock?: PagesModel;
  queries?: Partial<ServicesContextProps>;
};

const renderEditPageId = ({
  layoutSettingsMock = formLayoutSettingsMock,
  pagesMock = pagesModelMock,
  queries,
}: renderEditPageIdParams) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.FormLayoutSettings, org, app, layoutSetName],
    layoutSettingsMock,
  );
  queryClient.setQueryData([QueryKey.Pages, org, app, layoutSetName], pagesMock);
  return renderWithProviders(<EditPageId layoutName={selectedLayout} />, { queries, queryClient });
};
