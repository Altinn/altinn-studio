import React from 'react';
import { IPageElementProps, PageElement } from './PageElement';
import { formDesignerMock, queriesMock, renderHookWithMockStore, renderWithMockStore } from '../../testing/mocks';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { textMock } from '../../../../../testing/mocks/i18nMock';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';
const name = formDesignerMock.layout.selectedLayout;
const defaultProps: IPageElementProps = { name };

describe('PageElement', () => {
  it('Calls updateFormLayoutName with new name when name is changed by the user', async () => {
    const newName = 'new-name';
    await waitForData();
    render();
    await act(() => user.click(screen.getByTitle(textMock('general.options'))));
    await act(() => user.click(screen.getByText(textMock('left_menu.page_menu_edit'))));
    const textbox = screen.getByRole('textbox');
    expect(textbox).toHaveValue(name);
    await act(() => user.clear(textbox));
    await act(() => user.type(textbox, newName));
    await act(() => user.tab());
    expect(queriesMock.updateFormLayoutName).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateFormLayoutName).toHaveBeenCalledWith(org, app, name, newName, selectedLayoutSet);
  });
});

const render = (props: Partial<IPageElementProps> = {}) =>
  renderWithMockStore()(<PageElement {...defaultProps} {...props} />);

const waitForData = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  const settingsResult = renderHookWithMockStore()(() => useFormLayoutSettingsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};
