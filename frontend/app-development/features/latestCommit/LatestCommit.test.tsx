import React from 'react';
import { render, screen } from '@testing-library/react';
import { LatestCommit } from './LatestCommit';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const renderLatestCommit = (queries?: Partial<ServicesContextProps>) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  render(
    <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
      <LatestCommit />
    </ServicesContextProvider>,
  );
};

describe('LatestCommit', () => {
  afterEach(() => jest.clearAllMocks);
  it('renders the component with a spinner', () => {
    renderLatestCommit();
    expect(screen.getByText(textMock('process_editor.loading'))).toBeInTheDocument();
  });
});
