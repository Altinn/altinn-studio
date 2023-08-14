import React from 'react';
import { render as rtlRender, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { SchemaEditorApp } from './SchemaEditorApp';
import { PreviewConnectionContextProvider } from "app-shared/providers/PreviewConnectionContext";
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { textMock } from '../../../testing/mocks/i18nMock';
import { dataMock } from '@altinn/schema-editor/mockData';

// Mocks:
const schemaEditorTestId = 'schema-editor';
jest.mock('./components/SchemaEditor', () => ({
  SchemaEditor: () => <div data-testid={schemaEditorTestId}/>,
}));

export const render = () => {
  const getDatamodel = jest.fn().mockImplementation(() => Promise.resolve(dataMock));
  rtlRender(
    <ServicesContextProvider
      {...{ ...queriesMock, getDatamodel }}
      client={createQueryClientMock()}
    >
      <PreviewConnectionContextProvider>
        <SchemaEditorApp modelName='test' modelPath='test'/>
      </PreviewConnectionContextProvider>
    </ServicesContextProvider>
  );
};

describe('SchemaEditorApp', () => {
  it('should render the spinner when loading', async () => {
    render();
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('Renders schema editor when finished loading', async () => {
    render();
    await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));
    expect(screen.getByTestId(schemaEditorTestId)).toBeInTheDocument();
  });
});
