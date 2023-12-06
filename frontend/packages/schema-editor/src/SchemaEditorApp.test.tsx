import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import { SchemaEditorApp } from './SchemaEditorApp';
import { dataMock } from '@altinn/schema-editor/mockData';
import { jsonMetadataMock } from 'app-shared/mocks/datamodelMetadataMocks';
import userEvent from '@testing-library/user-event';
import { useSchemaEditorAppContext } from './hooks/useSchemaEditorAppContext';
import { uiSchemaNodesMock } from '../test/mocks/uiSchemaMock';
import { AUTOSAVE_DEBOUNCE_INTERVAL } from 'app-shared/constants';
import { buildJsonSchema, buildUiSchema, SchemaModel } from '@altinn/schema-model';

jest.useFakeTimers({ advanceTimers: true });

// Mocks:
const schemaEditorAppTestId = 'schema-editor';
const saveMock = jest.fn();
const initialProps = {
  datamodels: [jsonMetadataMock],
  jsonSchema: dataMock,
  modelPath: jsonMetadataMock.repositoryRelativeUrl,
  save: saveMock,
};

export const render = (ChildComponent?: React.ElementType) => {
  return rtlRender(
    <SchemaEditorApp {...initialProps}>{ChildComponent && <ChildComponent />}</SchemaEditorApp>,
  );
};

describe('SchemaEditorApp', () => {
  afterEach(jest.clearAllMocks);

  it('Renders children', async () => {
    render(() => <div data-testid={schemaEditorAppTestId} />);
    expect(screen.getByTestId(schemaEditorAppTestId)).toBeInTheDocument();
  });

  it('Debounces the save function', async () => {
    const user = userEvent.setup();

    render(() => {
      const { schemaModel, save } = useSchemaEditorAppContext();
      return (
        <>
          <div data-testid='data'>{JSON.stringify(schemaModel.asArray())}</div>
          <button
            data-testid='button'
            onClick={() => save(SchemaModel.fromArray(uiSchemaNodesMock))}
          />
        </>
      );
    });

    expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(buildUiSchema(dataMock)));

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    expect(saveMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL);

    expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(uiSchemaNodesMock));

    expect(saveMock).toHaveBeenCalledWith({
      modelPath: jsonMetadataMock.repositoryRelativeUrl,
      model: buildJsonSchema(uiSchemaNodesMock),
    });
  });

  it('Autosaves when changing model', async () => {
    const { rerender } = render();

    expect(saveMock).not.toHaveBeenCalled();

    const updatedProps = {
      ...initialProps,
      modelPath: 'newModel',
    };
    rerender(<SchemaEditorApp {...updatedProps} />);

    expect(saveMock).toHaveBeenCalledWith({
      modelPath: jsonMetadataMock.repositoryRelativeUrl,
      model: buildJsonSchema(buildUiSchema(dataMock)),
    });
  });

  it('Does not save when model is deleted', async () => {
    const { rerender } = render();

    const updatedProps = {
      ...initialProps,
      datamodels: [
        {
          ...jsonMetadataMock,
          repositoryRelativeUrl: 'newModel',
        },
      ],
      modelPath: 'newModel',
    };

    rerender(<SchemaEditorApp {...updatedProps} />);

    expect(saveMock).not.toHaveBeenCalled();
  });
});
