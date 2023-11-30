import React from 'react';
import { formLayoutSettingsMock, renderWithMockStore } from '../../testing/mocks';
import { DesignView } from './DesignView';
import { act, screen } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { FormContextProvider } from '../FormContext';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import userEvent from '@testing-library/user-event';
import { queriesMock } from '../../testing/mocks';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { externalLayoutsMock } from '../../testing/layoutMock';
import { convertExternalLayoutsToInternalFormat } from '../../utils/formLayoutsUtils';

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

// Mocking console.error due to Tanstack Query removing custom logger between V4 and v5 see issue: #11692
const realConsole = console;

describe('DesignView', () => {
  beforeEach(() => {
    global.console = {
      ...console,
      error: jest.fn(),
    };
  });
  afterEach(() => {
    global.console = realConsole;
    jest.clearAllMocks();
  });

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

  it('Displays the tree view version of the layout when the formTree feature flag is enabled', async () => {
    typedLocalStorage.setItem('featureFlags', ['formTree']);
    await render();
    expect(screen.getByRole('tree')).toBeInTheDocument();
  });
});
const render = async () => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.FormLayouts, mockOrg, mockApp, mockSelectedLayoutSet],
    convertExternalLayoutsToInternalFormat(externalLayoutsMock).convertedLayouts,
  );
  queryClient.setQueryData(
    [QueryKey.FormLayoutSettings, mockOrg, mockApp, mockSelectedLayoutSet],
    formLayoutSettingsMock,
  );

  return renderWithMockStore(
    {},
    {},
    queryClient,
  )(
    <DragAndDrop.Provider rootId={BASE_CONTAINER_ID} onMove={jest.fn()} onAdd={jest.fn()}>
      <FormContextProvider>
        <DesignView />
      </FormContextProvider>
    </DragAndDrop.Provider>,
  );
};
