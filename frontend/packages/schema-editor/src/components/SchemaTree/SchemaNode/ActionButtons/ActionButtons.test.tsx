import React from 'react';
import { render as studioRender, screen } from '@testing-library/react';
import { ActionButtons, ActionButtonsProps } from './ActionButtons';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import {
  objectNodeMock,
  uiSchemaNodesMock,
} from '../../../../../../schema-editor/test/mocks/uiSchemaMock';
import {
  SchemaEditorAppContext,
  SchemaEditorAppContextProps,
} from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { SchemaModel } from '@altinn/schema-model';

describe('ActionButtons', () => {
  afterEach(jest.clearAllMocks);

  const { pointer } = objectNodeMock;
  const hasReferringNodes = jest.fn();

  test('Renders ActionButton with delete title when no referring nodes', async () => {
    render({ pointer });
    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).not.toBeDisabled();
  });

  test('Renders ActionButton with disable deletion title when referring nodes', async () => {
    //const user = userEvent.setup();
    hasReferringNodes.mockReturnValue(true);
    render({ pointer });
    // TODO
    //access element properity and click it

    const deleteButton = screen.getByRole('button', {
      name: textMock('schema_editor.disable_deletion_info_for_used_definition'),
    });

    expect(deleteButton).toBeDisabled();
  });
});

const render = (props: Partial<ActionButtonsProps>) => {
  const allProps: ActionButtonsProps = {
    pointer: objectNodeMock.pointer,
    className: 'test',
    ...props,
  };
  const schemaModel: SchemaModel = SchemaModel.fromArray(uiSchemaNodesMock);
  const providedContext: SchemaEditorAppContextProps = {
    schemaModel,
    save: jest.fn(),
    setSelectedTypePointer: jest.fn(),
    setSelectedNodePointer: jest.fn(),
  };

  return studioRender(
    <SchemaEditorAppContext.Provider value={providedContext}>
      <ActionButtons {...allProps} />
    </SchemaEditorAppContext.Provider>,
  );
};
