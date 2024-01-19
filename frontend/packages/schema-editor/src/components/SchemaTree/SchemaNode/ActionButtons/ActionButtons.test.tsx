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

const deleteButtonMock = 'general.delete';
const promotbutton = 'schema_editor.promote';

describe('ActionButtons', () => {
  afterEach(jest.clearAllMocks);

  const { pointer } = objectNodeMock;

  it('Renders the actionButton (Convert to type)', async () => {
    render({ pointer });
    const referenceButton = screen.getByRole('button', { name: textMock(promotbutton) });
    expect(referenceButton).toBeInTheDocument();
  });

  test('Renders the actionButton (delete)', async () => {
    render({ pointer });
    const deleteButton = screen.getByRole('button', { name: textMock(deleteButtonMock) });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).not.toBeDisabled();
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
