import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithMockStore } from './testing/mocks';
import { App } from './App';
import { textMock } from '../../../testing/mocks/i18nMock';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { appStateMock } from './testing/stateMocks';
import { AppContextProps } from './AppContext';

const { selectedLayoutSet } = appStateMock.formDesigner.layout;
const removeSelectedLayoutSetMock = jest.fn();
const render = (selectedLayoutSetForRender: string) => {
  const queries: Partial<ServicesContextProps> = {
    getInstanceIdForPreview: jest.fn().mockImplementation(() => Promise.resolve('test')),
  };
  const appContextProps: Partial<AppContextProps> = {
    selectedLayoutSet: selectedLayoutSetForRender,
    removeSelectedLayoutSet: removeSelectedLayoutSetMock,
  };
  return renderWithMockStore({}, queries, undefined, appContextProps)(<App />);
};

describe('App', () => {
  afterEach(jest.clearAllMocks);

  it('should render the spinner', () => {
    render(selectedLayoutSet);
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('should render the component', async () => {
    render(selectedLayoutSet);
    await waitFor(() =>
      expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument(),
    );
  });

  it('Removes the preview layout set from local storage if it does not exist', async () => {
    const layoutSetThatDoesNotExist = 'layout-set-that-does-not-exist';
    render(layoutSetThatDoesNotExist);
    await waitFor(() =>
      expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument(),
    );
    expect(removeSelectedLayoutSetMock).toHaveBeenCalledTimes(1);
  });

  it('Does not remove the preview layout set from local storage if it exists', async () => {
    jest.spyOn(typedLocalStorage, 'getItem').mockReturnValue(selectedLayoutSet);
    render(selectedLayoutSet);
    await waitFor(() =>
      expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument(),
    );
    expect(removeSelectedLayoutSetMock).not.toHaveBeenCalled();
  });
});
