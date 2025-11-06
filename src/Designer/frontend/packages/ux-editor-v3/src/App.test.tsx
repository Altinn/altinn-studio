import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { formLayoutSettingsMock, renderWithProviders } from './testing/mocks';
import { App } from './App';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { typedLocalStorage } from '@studio/pure-functions';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { appStateMock } from './testing/stateMocks';
import type { AppContextProps } from './AppContext';
import ruleHandlerMock from './testing/ruleHandlerMock';
import { layoutSetsMock } from './testing/layoutSetsMock';

const { selectedLayoutSet } = appStateMock.formDesigner.layout;

const renderApp = (
  queries: Partial<ServicesContextProps> = {},
  appContextProps: Partial<AppContextProps> = {},
) => {
  return renderWithProviders(<App />, {
    queries,
    appContextProps,
  });
};

describe('App', () => {
  it('should render the spinner', () => {
    renderApp({}, { selectedLayoutSet });
    expect(screen.getByLabelText(textMock('ux_editor.loading_page'))).toBeInTheDocument();
  });

  it('should render the component', async () => {
    const mockQueries: Partial<ServicesContextProps> = {
      getRuleModel: jest.fn().mockImplementation(() => Promise.resolve(ruleHandlerMock)),
      getLayoutSets: jest.fn().mockImplementation(() => Promise.resolve(layoutSetsMock)),
      getFormLayoutSettings: jest
        .fn()
        .mockImplementation(() => Promise.resolve(formLayoutSettingsMock)),
    };
    renderApp(mockQueries, { selectedLayoutSet });
    await waitFor(() =>
      expect(screen.queryByLabelText(textMock('ux_editor.loading_page'))).not.toBeInTheDocument(),
    );
  });

  it('Removes the preview layout set from local storage if it does not exist', async () => {
    const removeSelectedLayoutSetMock = jest.fn();
    const layoutSetThatDoesNotExist = 'layout-set-that-does-not-exist';
    const mockQueries: Partial<ServicesContextProps> = {
      getRuleModel: jest.fn().mockImplementation(() => Promise.resolve(ruleHandlerMock)),
      getLayoutSets: jest.fn().mockImplementation(() => Promise.resolve(layoutSetsMock)),
      getFormLayoutSettings: jest
        .fn()
        .mockImplementation(() => Promise.resolve(formLayoutSettingsMock)),
    };
    renderApp(mockQueries, {
      selectedLayoutSet: layoutSetThatDoesNotExist,
      removeSelectedLayoutSet: removeSelectedLayoutSetMock,
    });
    await waitFor(() =>
      expect(screen.queryByLabelText(textMock('ux_editor.loading_page'))).not.toBeInTheDocument(),
    );
    expect(removeSelectedLayoutSetMock).toHaveBeenCalledTimes(1);
  });

  it('Does not remove the preview layout set from local storage if it exists', async () => {
    const removeSelectedLayoutSetMock = jest.fn();
    const mockQueries: Partial<ServicesContextProps> = {
      getRuleModel: jest.fn().mockImplementation(() => Promise.resolve(ruleHandlerMock)),
      getLayoutSets: jest.fn().mockImplementation(() => Promise.resolve(layoutSetsMock)),
      getFormLayoutSettings: jest
        .fn()
        .mockImplementation(() => Promise.resolve(formLayoutSettingsMock)),
    };
    jest.spyOn(typedLocalStorage, 'getItem').mockReturnValue(selectedLayoutSet);
    renderApp(mockQueries, {
      selectedLayoutSet,
      removeSelectedLayoutSet: removeSelectedLayoutSetMock,
    });
    await waitFor(() =>
      expect(screen.queryByLabelText(textMock('ux_editor.loading_page'))).not.toBeInTheDocument(),
    );
    expect(removeSelectedLayoutSetMock).not.toHaveBeenCalled();
  });
});
