import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { SchemaEditorApp } from './SchemaEditorApp';
import { jsonMetadataMock } from 'app-shared/mocks/datamodelMetadataMocks';
import { jsonSchemaMock } from '../test/mocks/jsonSchemaMock';


// Mocks:
const saveMock = jest.fn();
const initialProps = {
  datamodels: [jsonMetadataMock],
  jsonSchema: jsonSchemaMock,
  modelPath: jsonMetadataMock.repositoryRelativeUrl,
  save: saveMock,
};

export const render = () => rtlRender(<SchemaEditorApp {...initialProps}/>);

describe('SchemaEditorApp', () => {
  afterEach(jest.clearAllMocks);

  it('Renders a tree view of the schema model', () => {
    render();
    expect(screen.getByRole('tree')).toBeInTheDocument();
  });
});
