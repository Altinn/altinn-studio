import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  formLayoutSettingsMock,
  renderHookWithProviders,
  renderWithProviders,
} from '../testing/mocks';
import { FormDesigner } from './FormDesigner';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useWidgetsQuery } from '../hooks/queries/useWidgetsQuery';
import type { ITextResources } from 'app-shared/types/global';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { externalLayoutsMock, layout1NameMock, pagesModelMock } from '../testing/layoutMock';
import { FormItemContext } from './FormItemContext';
import { formItemContextProviderMock } from '../testing/formItemContextMocks';
import { appContextMock } from '../testing/appContextMock';
import { app, org } from '@studio/testing/testids';
import userEvent from '@testing-library/user-event';
import { user as userMock } from 'app-shared/mocks/mocks';

jest.mock('app-shared/api/mutations', () => ({
  createPreviewInstance: jest.fn().mockReturnValue(Promise.resolve({ id: 1 })),
}));

// Test data:
const defaultTexts: ITextResources = {
  [DEFAULT_LANGUAGE]: [],
};
const dataModelName = undefined;
const user = userEvent.setup();

const render = () => {
  const queryClient = createQueryClientMock();
  const queries = {
    getFormLayouts: jest.fn().mockImplementation(() => Promise.resolve(externalLayoutsMock)),
    getFormLayoutSettings: jest
      .fn()
      .mockImplementation(() => Promise.resolve(formLayoutSettingsMock)),
    getInstanceIdForPreview: jest.fn().mockImplementation(() => Promise.resolve<string>('test')),
    getPages: jest.fn().mockImplementation(() => Promise.resolve(pagesModelMock)),
  };
  queryClient.setQueryData(
    [QueryKey.DataModelMetadata, org, app, 'test-layout-set', dataModelName],
    [],
  );
  queryClient.setQueryData([QueryKey.TextResources, org, app], defaultTexts);
  queryClient.setQueryData([QueryKey.CurrentUser], [userMock]);
  return renderWithProviders(
    <FormItemContext.Provider
      value={{
        ...formItemContextProviderMock,
      }}
    >
      <FormDesigner />
    </FormItemContext.Provider>,
    {
      queries,
      queryClient,
      appContextProps: {
        selectedFormLayoutName: layout1NameMock,
      },
    },
  );
};

const waitForData = async () => {
  const widgetsResult = renderHookWithProviders(() => useWidgetsQuery(org, app)).result;
  await waitFor(() => expect(widgetsResult.current.isSuccess).toBe(true));
};

const dragAndDrop = (src: Element, dst: Element) => {
  fireEvent.dragStart(src);
  fireEvent.dragEnter(dst);
  fireEvent.drop(dst);
  fireEvent.dragLeave(dst);
  fireEvent.dragEnd(src);
};

describe('FormDesigner', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the spinner', () => {
    render();
    expect(screen.getByText(textMock('ux_editor.loading_form_layout'))).toBeInTheDocument();
  });

  it('should render the component', async () => {
    await waitForData();
    render();
    await waitFor(() =>
      expect(screen.queryByText(textMock('ux_editor.loading_form_layout'))).not.toBeInTheDocument(),
    );
  });

  it('should add a component', async () => {
    await waitForData();
    render();
    const component = await screen.findAllByText(textMock('ux_editor.component_title.TextArea'));
    const tree = await screen.findByRole('tree');
    dragAndDrop(component[0], tree);

    await waitFor(() => expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1));
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      'test-layout-set',
      expect.any(Object),
    );
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledWith('test-layout-set');
  });

  it('should move a component', async () => {
    await waitForData();
    render();

    const tree = await screen.findByRole('tree');
    const component = await within(tree).findByText(textMock('ux_editor.component_title.Input'));
    dragAndDrop(component, tree);

    await waitFor(() => expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1));
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      'test-layout-set',
      expect.any(Object),
    );
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledWith('test-layout-set');
  });

  it('should be able to collapse and uncollapse components', async () => {
    await waitForData();
    render();

    await waitFor(() =>
      expect(screen.queryByText(textMock('ux_editor.loading_form_layout'))).not.toBeInTheDocument(),
    );

    await user.click(screen.getByTitle(textMock('left_menu.close_components')));
    expect(screen.getByTitle(textMock('left_menu.open_components'))).toBeInTheDocument();

    await user.click(screen.getByTitle(textMock('left_menu.open_components')));
    expect(screen.getByTitle(textMock('left_menu.close_components'))).toBeInTheDocument();
  });

  it('should be able to collapse and uncollapse preview', async () => {
    await waitForData();
    render();

    await waitFor(() =>
      expect(screen.queryByText(textMock('ux_editor.loading_form_layout'))).not.toBeInTheDocument(),
    );

    await user.click(screen.getByTitle(textMock('ux_editor.close_preview')));
    expect(screen.getByTitle(textMock('ux_editor.open_preview'))).toBeInTheDocument();

    await user.click(screen.getByTitle(textMock('ux_editor.open_preview')));
    expect(screen.getByTitle(textMock('ux_editor.close_preview'))).toBeInTheDocument();
  });
});
