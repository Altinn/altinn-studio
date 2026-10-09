import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
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
import * as useDeleteLayoutModule from './useDeleteLayout';

const mockPageName1: string = layout1NameMock;
const mockSelectedLayoutSet = layoutSet1NameMock;
const mockPageName2 = layout2NameMock;

const mockSetSearchParams = vi.fn();
const mockSearchParams = { layout: mockPageName1 };
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useParams: () => ({
    org,
    app,
  }),
  useSearchParams: () => {
    return [new URLSearchParams(mockSearchParams), mockSetSearchParams];
  },
}));

const mockDeleteFormLayout = vi.fn();
vi.mock('./useDeleteLayout', () => ({
  useDeleteLayout: vi.fn(() => ({ mutate: mockDeleteFormLayout, isPending: false })),
}));

const mockChildren: ReactNode = (
  <div>
    <button>Test</button>
  </div>
);
const mockOnClick = vi.fn();

const defaultProps: PageAccordionProps = {
  pageName: mockPageName1,
  children: mockChildren,
  isOpen: false,
  onClick: mockOnClick,
};

describe('PageAccordion', () => {
  afterEach(vi.clearAllMocks);

  it('Calls "onClick" when the accordion is clicked', async () => {
    const user = userEvent.setup();
    await render();

    const accordionButton = screen.getByText(mockPageName1);
    await user.click(accordionButton);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('opens the NavigationMenu when the menu icon is clicked', async () => {
    const user = userEvent.setup();
    await render();

    const menuButton = screen.getByRole('button', { name: textMock('general.options') });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuButton);

    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('menuitem', { name: textMock('ux_editor.page_menu_up') }),
    ).toBeInTheDocument();
  });

  it('Calls deleteLayout with pageName when delete button is clicked and deletion is confirmed, and updates the url correctly', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockImplementation(vi.fn(() => true));
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
    vi.spyOn(window, 'confirm').mockImplementation(vi.fn(() => true));
    vi.spyOn(useDeleteLayoutModule, 'useDeleteLayout').mockImplementation(
      () =>
        ({ mutate: mockDeleteFormLayout, isPending: true }) as unknown as ReturnType<
          typeof useDeleteLayoutModule.useDeleteLayout
        >,
    );
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
    vi.spyOn(window, 'confirm').mockImplementation(vi.fn(() => false));
    await render();

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete_item', { item: mockPageName1 }),
    });
    await user.click(deleteButton);
    expect(mockDeleteFormLayout).not.toHaveBeenCalled();
  });
});

const waitForData = async () => {
  const getFormLayoutSettings = vi
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
