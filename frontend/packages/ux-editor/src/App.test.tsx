import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { queryClientMock, renderWithMockStore } from './testing/mocks';
import { App } from './App';
import { textMock } from '../../../testing/mocks/i18nMock';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { appStateMock } from './testing/stateMocks';
import { AppContextProps } from './AppContext';

const removeSelectedLayoutSetMock = jest.fn();
const render = () => {
  const queries: Partial<ServicesContextProps> = {
    getInstanceIdForPreview: jest.fn().mockImplementation(() => Promise.resolve('test')),
  };
  const appContextProps: Partial<AppContextProps> = {
    selectedLayoutSet: 'layout-set-that-does-not-exist',
    removeSelectedLayoutSet: removeSelectedLayoutSetMock,
  };
  return renderWithMockStore({}, queries, queryClientMock, appContextProps)(<App />);
};

describe('App', () => {
  afterEach(jest.clearAllMocks);

  it('should render the spinner', () => {
    render();
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('should render the component', async () => {
    render();
    await waitFor(() =>
      expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument(),
    );
  });

  it('Removes the preview layout set from local storage if it does not exist', async () => {
    render();
    await waitFor(() =>
      expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument(),
    );
    expect(removeSelectedLayoutSetMock).toHaveBeenCalledTimes(1);
  });

  it('Does not remove the preview layout set from local storage if it exists', async () => {
    const { selectedLayoutSet } = appStateMock.formDesigner.layout;
    jest.spyOn(typedLocalStorage, 'getItem').mockReturnValue(selectedLayoutSet);
    const removeItem = jest.spyOn(typedLocalStorage, 'removeItem');
    render();
    await waitFor(() =>
      expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument(),
    );
    expect(removeItem).not.toHaveBeenCalled();
  });
});
