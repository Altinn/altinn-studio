import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { SchemaEditorApp } from './SchemaEditorApp';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { dataMock } from '@altinn/schema-editor/mockData';
import { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';
import { jsonMetadataMock } from 'app-shared/mocks/datamodelMetadataMocks';

// Mocks:
const schemaEditorAppTestId = 'schema-editor';

export const render = () => {
  const getDatamodel = jest.fn().mockImplementation(() => Promise.resolve(dataMock));
  const datamodels: DatamodelMetadata[] = [jsonMetadataMock];
  rtlRender(
    <ServicesContextProvider {...{ ...queriesMock, getDatamodel }} client={createQueryClientMock()}>
      <PreviewConnectionContextProvider>
        <SchemaEditorApp datamodels={datamodels} jsonSchema={dataMock} save={jest.fn()}>
          <div data-testid={schemaEditorAppTestId}></div>
        </SchemaEditorApp>
      </PreviewConnectionContextProvider>
    </ServicesContextProvider>
  );
};

describe('SchemaEditorApp', () => {
  it('Renders children', async () => {
    render();
    expect(screen.getByTestId(schemaEditorAppTestId)).toBeInTheDocument();
  });
});
