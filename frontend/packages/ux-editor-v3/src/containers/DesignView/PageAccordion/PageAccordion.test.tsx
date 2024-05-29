import type { ReactNode } from 'react';
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import type { PageAccordionProps } from './PageAccordion';
import { PageAccordion } from './PageAccordion';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useFormLayoutSettingsQuery } from '../../../hooks/queries/useFormLayoutSettingsQuery';
import {
  formLayoutSettingsMock,
  renderHookWithMockStore,
  renderWithMockStore,
} from '../../../testing/mocks';
import { layout1NameMock, layout2NameMock } from '@altinn/ux-editor-v3/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';

const mockPageName1: string = layout1NameMock;
const mockSelectedLayoutSet = layoutSet1NameMock;
const mockPageName2 = layout2NameMock;

const mockSetSearchParams = jest.fn();
const mockSearchParams = { layout: mockPageName1 };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org,
    app,
  }),
  useSearchParams: () => {
    return [new URLSearchParams(mockSearchParams), mockSetSearchParams];
  },
}));

const mockDeleteFormLayout = jest.fn();
jest.mock('./useDeleteLayout', () => ({
  useDeleteLayout: jest.fn(() => ({ mutate: mockDeleteFormLayout, isPending: false })),
}));

const mockChildren: ReactNode = (
  <div>
    <button>Test</button>
  </div>
);
const mockOnClick = jest.fn();

const defaultProps: PageAccordionProps = {
  pageName: mockPageName1,
  children: mockChildren,
  isOpen: false,
  onClick: mockOnClick,
};

describe('PageAccordion', () => {
  afterEach(jest.clearAllMocks);

  it('Calls "onClick" when the accordion is clicked', async () => {
    const user = userEvent.setup();
    await render();

    const accordionButton = screen.getByRole('button', { name: mockPageName1 });
    await user.click(accordionButton);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('opens the NavigationMenu when the menu icon is clicked', async () => {
    const user = userEvent.setup();
    await render();

    const elementInMenu = screen.queryByText(textMock('ux_editor.page_menu_up'));
    expect(elementInMenu).not.toBeInTheDocument();

    const menuButton = screen.getByRole('button', { name: textMock('general.options') });
    await user.click(menuButton);

    const elementInMenuAfter = screen.getByText(textMock('ux_editor.page_menu_up'));
    expect(elementInMenuAfter).toBeInTheDocument();
  });

  it('Calls deleteLayout with pageName when delete button is clicked and deletion is confirmed, and updates the url correctly', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => true));
    await render();

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete_item', { item: mockPageName1 }),
    });
    await user.click(deleteButton);

    expect(mockDeleteFormLayout).toHaveBeenCalledTimes(1);
    expect(mockDeleteFormLayout).toHaveBeenCalledWith(mockPageName1);
    expect(mockSetSearchParams).toHaveBeenCalledWith({ layout: mockPageName2 });
  });

  it('Disables delete button when isPending is true', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => true));
    jest
      .spyOn(require('./useDeleteLayout'), 'useDeleteLayout')
      .mockImplementation(() => ({ mutate: mockDeleteFormLayout, isPending: true }));
    await render();
    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete_item', { item: mockPageName1 }),
    });

    expect(deleteButton).toBeDisabled();
    await user.click(deleteButton);
    expect(mockDeleteFormLayout).not.toHaveBeenCalled();
    expect(mockSetSearchParams).not.toHaveBeenCalled();
  });

  it('Does not call deleteLayout when delete button is clicked, but deletion is not confirmed', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => false));
    await render();

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete_item', { item: mockPageName1 }),
    });
    await user.click(deleteButton);
    expect(mockDeleteFormLayout).not.toHaveBeenCalled();
  });
});

const waitForData = async () => {
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve(formLayoutSettingsMock));
  const settingsResult = renderHookWithMockStore(
    {},
    { getFormLayoutSettings },
  )(() => useFormLayoutSettingsQuery(org, app, mockSelectedLayoutSet)).renderHookResult.result;

  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<PageAccordionProps> = {}) => {
  await waitForData();
  return renderWithMockStore()(<PageAccordion {...defaultProps} {...props} />);
};
