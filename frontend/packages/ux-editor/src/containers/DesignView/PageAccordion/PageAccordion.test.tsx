import type { ReactNode } from 'react';
import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import type { PageAccordionProps } from './PageAccordion';
import { PageAccordion } from './PageAccordion';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { useFormLayoutSettingsQuery } from '../../../hooks/queries/useFormLayoutSettingsQuery';
import {
  formLayoutSettingsMock,
  renderHookWithProviders,
  renderWithProviders,
} from '../../../testing/mocks';
import { layout1NameMock } from '../../../testing/layoutMock';

const mockOrg = 'org';
const mockApp = 'app';
const mockPageName1: string = layout1NameMock;
const mockSelectedLayoutSet = 'test-layout-set';
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

const mockDeleteFormLayout = jest.fn();
jest.mock('../../../hooks/mutations/useDeleteLayoutMutation', () => ({
  useDeleteLayoutMutation: jest.fn(() => ({ mutate: mockDeleteFormLayout, isPending: false })),
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
    await act(() => user.click(accordionButton));

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('opens the NavigationMenu when the menu icon is clicked', async () => {
    const user = userEvent.setup();
    await render();

    const elementInMenu = screen.queryByText(textMock('ux_editor.page_menu_up'));
    expect(elementInMenu).not.toBeInTheDocument();

    const menuButton = screen.getByRole('button', { name: textMock('general.options') });
    await act(() => user.click(menuButton));

    const elementInMenuAfter = screen.getByText(textMock('ux_editor.page_menu_up'));
    expect(elementInMenuAfter).toBeInTheDocument();
  });

  it('Calls deleteLayout with pageName when delete button is clicked and deletion is confirmed', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => true));
    await render();

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete_item', { item: mockPageName1 }),
    });
    await act(() => user.click(deleteButton));

    expect(mockDeleteFormLayout).toHaveBeenCalledTimes(1);
    expect(mockDeleteFormLayout).toHaveBeenCalledWith(mockPageName1);
  });

  it('Disables delete button when isPending is true', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => true));
    jest
      .spyOn(require('../../../hooks/mutations/useDeleteLayoutMutation'), 'useDeleteLayoutMutation')
      .mockImplementation(() => ({ mutate: mockDeleteFormLayout, isPending: true }));
    await render();
    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete_item', { item: mockPageName1 }),
    });

    expect(deleteButton).toBeDisabled();
    await act(() => user.click(deleteButton));
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
    await act(() => user.click(deleteButton));
    expect(mockDeleteFormLayout).not.toHaveBeenCalled();
  });
});

const waitForData = async () => {
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve(formLayoutSettingsMock));
  const settingsResult = renderHookWithProviders(
    () => useFormLayoutSettingsQuery(mockOrg, mockApp, mockSelectedLayoutSet),
    { queries: { getFormLayoutSettings } },
  ).result;

  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<PageAccordionProps> = {}) => {
  await waitForData();
  return renderWithProviders(<PageAccordion {...defaultProps} {...props} />);
};
