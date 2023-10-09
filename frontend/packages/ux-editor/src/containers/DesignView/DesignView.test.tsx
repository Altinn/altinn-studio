import React from 'react';
import {
  formLayoutSettingsMock,
  renderHookWithMockStore,
  renderWithMockStore,
} from '../../testing/mocks';
import { DesignView } from './DesignView';
import { act, screen, waitFor } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import { FormContextProvider } from '../FormContext';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import userEvent from '@testing-library/user-event';
import { queriesMock } from '../../testing/mocks';

const mockOrg = 'org';
const mockApp = 'app';
const mockSelectedLayoutSet = 'test-layout-set';
const mockPageName1: string = formLayoutSettingsMock.pages.order[0];
const mockPageName2: string = formLayoutSettingsMock.pages.order[1];

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

describe('DesignView', () => {
  afterEach(jest.clearAllMocks);

  it('displays the correct number of accordions', async () => {
    await render();

    formLayoutSettingsMock.pages.order.forEach((page) => {
      const accordionButton = screen.getByRole('button', { name: page });
      expect(accordionButton).toBeInTheDocument();
    });
  });

  it('calls "setSearchParams" with undefined when current page the accordion is clicked', async () => {
    const user = userEvent.setup();
    await render();

    const accordionButton1 = screen.getByRole('button', { name: mockPageName1 });
    await act(() => user.click(accordionButton1));

    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
    expect(mockSetSearchParams).toHaveBeenCalledWith(undefined);
  });

  it('calls "setSearchParams" with the new page when another page accordion is clicked', async () => {
    const user = userEvent.setup();
    await render();

    const accordionButton2 = screen.getByRole('button', { name: mockPageName2 });
    await act(() => user.click(accordionButton2));

    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
  });

  it('calls "saveFormLayout" when add page is clicked', async () => {
    const user = userEvent.setup();
    await render();

    const addButton = screen.getByRole('button', { name: textMock('ux_editor.pages_add') });
    await act(() => user.click(addButton));

    expect(queriesMock.saveFormLayout).toHaveBeenCalled();
  });
});

const waitForData = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() =>
    useFormLayoutsQuery(mockOrg, mockApp, mockSelectedLayoutSet),
  ).renderHookResult.result;

  const settingsResult = renderHookWithMockStore()(() =>
    useFormLayoutSettingsQuery(mockOrg, mockApp, mockSelectedLayoutSet),
  ).renderHookResult.result;

  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async () => {
  await waitForData();
  return renderWithMockStore()(
    <DragAndDrop.Provider rootId={BASE_CONTAINER_ID} onMove={jest.fn()} onAdd={jest.fn()}>
      <FormContextProvider>
        <DesignView />
      </FormContextProvider>
    </DragAndDrop.Provider>,
  );
};
