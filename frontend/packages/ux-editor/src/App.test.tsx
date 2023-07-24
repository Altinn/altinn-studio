import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithMockStore } from './testing/mocks';
import { App } from './App';
import { textMock } from '../../../testing/mocks/i18nMock';

const render = () => {
  const queries = {
    getInstanceIdForPreview: jest.fn().mockImplementation(() => Promise.resolve('test'))
  };
  return renderWithMockStore({ errors: { errorList: [] } }, queries)(
    <App />
  );
};

describe('App', () => {
  it('should render the spinner', () => {
    render();
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('should render the component', async () => {
    render();
    await waitFor(() => expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument());
  });
});
