import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { formLayoutSettingsMock, renderWithProviders } from './testing/mocks';
import { App } from './App';
import { textMock } from '../../../testing/mocks/i18nMock';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { appStateMock } from './testing/stateMocks';
import type { AppContextProps } from './AppContext';
import ruleHandlerMock from './testing/ruleHandlerMock';
import { layoutSetsMock } from './testing/layoutMock';

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
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('should render the component', async () => {
    const mockQueries: Partial<ServicesContextProps> = {
      getInstanceIdForPreview: jest.fn().mockImplementation(() => Promise.resolve('test')),
      getRuleModel: jest.fn().mockImplementation(() => Promise.resolve(ruleHandlerMock)),
      getLayoutSets: jest.fn().mockImplementation(() => Promise.resolve(layoutSetsMock)),
      getFormLayoutSettings: jest
        .fn()
        .mockImplementation(() => Promise.resolve(formLayoutSettingsMock)),
    };
    renderApp(mockQueries, { selectedLayoutSet });
    await waitFor(() =>
      expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument(),
    );
  });

  it('Removes the preview layout set from local storage if it does not exist', async () => {
    const removeSelectedLayoutSetMock = jest.fn();
    const layoutSetThatDoesNotExist = 'layout-set-that-does-not-exist';
    const mockQueries: Partial<ServicesContextProps> = {
      getInstanceIdForPreview: jest.fn().mockImplementation(() => Promise.resolve('test')),
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
      expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument(),
    );
    expect(removeSelectedLayoutSetMock).toHaveBeenCalledTimes(1);
  });

  it('Does not remove the preview layout set from local storage if it exists', async () => {
    const removeSelectedLayoutSetMock = jest.fn();
    const mockQueries: Partial<ServicesContextProps> = {
      getInstanceIdForPreview: jest.fn().mockImplementation(() => Promise.resolve('test')),
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
      expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument(),
    );
    expect(removeSelectedLayoutSetMock).not.toHaveBeenCalled();
  });
});
