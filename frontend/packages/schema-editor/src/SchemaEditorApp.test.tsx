import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import { SchemaEditorApp } from './SchemaEditorApp';
import { jsonMetadataMock } from 'app-shared/mocks/datamodelMetadataMocks';
import { jsonSchemaMock } from '../test/mocks/jsonSchemaMock';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../testing/mocks/i18nMock';

const user = userEvent.setup();

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

  it('Calls the save function when something is changed', async () => {
    render();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const firstDeleteButton = screen.getAllByRole('button', { name: textMock('general.delete') })[0];
    await act(() => user.click(firstDeleteButton));
    expect(saveMock).toHaveBeenCalledTimes(1);
  });
});
