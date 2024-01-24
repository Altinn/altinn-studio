import type { ReactNode } from 'react';
import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import type { PageAccordionProps } from './PageAccordion';
import { PageAccordion } from './PageAccordion';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { formDesignerMock } from '../../../testing/stateMocks';
import { useFormLayoutSettingsQuery } from '../../../hooks/queries/useFormLayoutSettingsQuery';
import {
  formLayoutSettingsMock,
  renderHookWithMockStore,
  renderWithMockStore,
} from '../../../testing/mocks';
import { layout2NameMock } from '../../../testing/layoutMock';

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

const mockDeleteFormLayout = jest.fn();
jest.mock('./useDeleteLayout', () => ({
  useDeleteLayout: () => mockDeleteFormLayout,
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

  it('Calls deleteLayout with pageName when delete button is clicked and deletion is confirmed, and updates the url correctly', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => true));
    await render();

    await screen
      .getByRole('button', { name: textMock('general.delete_item', { item: mockPageName1 }) })
      .click();
    expect(mockDeleteFormLayout).toHaveBeenCalledTimes(1);
    expect(mockDeleteFormLayout).toHaveBeenCalledWith(mockPageName1);
    expect(mockSetSearchParams).toHaveBeenCalledWith({ layout: mockPageName2 });
  });

  it('Does not call deleteLayout when delete button is clicked, but deletion is not confirmed', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => false));
    await render();
    await screen
      .getByRole('button', { name: textMock('general.delete_item', { item: mockPageName1 }) })
      .click();
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
  )(() => useFormLayoutSettingsQuery(mockOrg, mockApp, mockSelectedLayoutSet)).renderHookResult
    .result;

  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<PageAccordionProps> = {}) => {
  await waitForData();
  return renderWithMockStore()(<PageAccordion {...defaultProps} {...props} />);
};
