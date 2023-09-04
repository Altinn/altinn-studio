import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { SchemaEditorApp } from './SchemaEditorApp';
import { PreviewConnectionContextProvider } from "app-shared/providers/PreviewConnectionContext";
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { dataMock } from '@altinn/schema-editor/mockData';
import { uiSchemaNodesMock } from '../test/mocks/uiSchemaMock';

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
        <SchemaEditorApp data={uiSchemaNodesMock} save={jest.fn()}/>
      </PreviewConnectionContextProvider>
    </ServicesContextProvider>
  );
};

describe('SchemaEditorApp', () => {
  it('Renders schema editor', async () => {
    render();
    expect(screen.getByTestId(schemaEditorTestId)).toBeInTheDocument();
  });
});
