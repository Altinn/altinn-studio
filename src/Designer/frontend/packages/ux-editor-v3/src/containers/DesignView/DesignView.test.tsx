import React from 'react';
import { formLayoutSettingsMock, renderWithMockStore } from '../../testing/mocks';
import { DesignView } from './DesignView';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { FormItemContextProvider } from '../FormItemContext';
import { StudioDragAndDrop } from '@studio/components';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import userEvent from '@testing-library/user-event';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { typedLocalStorage } from '@studio/pure-functions';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import {
  externalLayoutsMock,
  layout1NameMock,
  layout2NameMock,
} from '@altinn/ux-editor-v3/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';
import { convertExternalLayoutsToInternalFormat } from '../../utils/formLayoutsUtils';
import { app, org } from '@studio/testing/testids';

const mockSelectedLayoutSet = layoutSet1NameMock;
const mockPageName1: string = layout1NameMock;
const mockPageName2: string = layout2NameMock;

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

describe('DesignView', () => {
  afterEach(() => {
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
    await user.click(accordionButton1);

    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
    expect(mockSetSearchParams).toHaveBeenCalledWith(undefined);
  });

  it('calls "setSearchParams" with the new page when another page accordion is clicked', async () => {
    const user = userEvent.setup();
    await render();

    const accordionButton2 = screen.getByRole('button', { name: mockPageName2 });
    await user.click(accordionButton2);

    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
  });

  it('calls "saveFormLayout" when add page is clicked', async () => {
    const user = userEvent.setup();
    await render();

    const addButton = screen.getByRole('button', { name: textMock('ux_editor.pages_add') });
    await user.click(addButton);

    expect(queriesMock.saveFormLayoutV3).toHaveBeenCalled();
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
    [QueryKey.FormLayouts, org, app, mockSelectedLayoutSet],
    convertExternalLayoutsToInternalFormat(externalLayoutsMock).convertedLayouts,
  );
  queryClient.setQueryData(
    [QueryKey.FormLayoutSettings, org, app, mockSelectedLayoutSet],
    formLayoutSettingsMock,
  );

  return renderWithMockStore(
    {},
    {},
    queryClient,
  )(
    <StudioDragAndDrop.Provider rootId={BASE_CONTAINER_ID} onMove={jest.fn()} onAdd={jest.fn()}>
      <FormItemContextProvider>
        <DesignView />
      </FormItemContextProvider>
    </StudioDragAndDrop.Provider>,
  );
};
