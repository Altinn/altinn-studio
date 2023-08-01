import React from 'react';
import { render as rtlRender, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { SchemaEditorApp } from './SchemaEditorApp';
import { PreviewConnectionContextProvider } from "app-shared/providers/PreviewConnectionContext";
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { textMock } from '../../../testing/mocks/i18nMock';
import { dataMock } from '@altinn/schema-editor/mockData';
import { jsonMetadata1Mock } from '../test/mocks/metadataMocks';

export const render = () => {
  const getDatamodel = jest.fn().mockImplementation(() => Promise.resolve(dataMock));
  const getDatamodels = jest.fn().mockImplementation(() => Promise.resolve([jsonMetadata1Mock]));
  const getDatamodelsXsd = jest.fn().mockImplementation(() => Promise.resolve([]));
  rtlRender(
    <ServicesContextProvider
      {...{ ...queriesMock, getDatamodel, getDatamodels, getDatamodelsXsd }}
      client={createQueryClientMock()}
    >
      <PreviewConnectionContextProvider>
        <SchemaEditorApp
          createPathOption={false}
          displayLandingPage={false}
        />
      </PreviewConnectionContextProvider>
    </ServicesContextProvider>
  );
};

describe('SchemaEditorApp', () => {
  it('should render the spinner when loading', async () => {
    render();
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('Renders toolbar when finished loading', async () => {
    render();
    await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });
});
