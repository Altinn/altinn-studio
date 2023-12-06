import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SchemaItemProps } from './SchemaItem';
import { SchemaItem } from './SchemaItem';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { SchemaState } from '@altinn/schema-editor/types';
import { buildUiSchema, FieldType, ObjectKind, SchemaModel } from '@altinn/schema-model';
import { dataMock } from '../../mockData';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';

const user = userEvent.setup();

describe('SchemaItem', () => {
  describe('Delete confirmation dialog', () => {
    afterEach(jest.clearAllMocks);

    it('should open the confirmation dialog when clicking the delete button', async () => {
      await render();

      await act(() => user.click(getMenuButton()));
      await act(() => user.click(getDeleteButton()));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const text = await screen.findByText(textMock('schema_editor.datamodel_field_deletion_text'));
      expect(text).toBeInTheDocument();

      const info = await screen.findByText(textMock('schema_editor.datamodel_field_deletion_info'));
      expect(info).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', {
        name: textMock('schema_editor.datamodel_field_deletion_confirm'),
      });
      expect(confirmButton).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should confirm and close the dialog when clicking the confirm button', async () => {
      const utils = await render();
      const dispatchSpy = jest.spyOn(utils.store, 'dispatch');

      await act(() => user.click(getMenuButton()));
      await act(() => user.click(getDeleteButton()));

      const confirmButton = screen.getByRole('button', {
        name: textMock('schema_editor.datamodel_field_deletion_confirm'),
      });
      await act(() => user.click(confirmButton));

      await waitFor(() => {
        expect(dispatchSpy).toBeCalledWith({
          payload: '#/$defs/Test',
          type: 'schemaEditor/removeSelection',
        });
      });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close the confirmation dialog when clicking the cancel button', async () => {
      const utils = await render();
      const dispatchSpy = jest.spyOn(utils.store, 'dispatch');

      await act(() => user.click(getMenuButton()));
      await act(() => user.click(getDeleteButton()));

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      await act(() => user.click(cancelButton));

      await waitFor(() => {
        expect(dispatchSpy).toBeCalledTimes(0);
      });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close when clicking outside the popover', async () => {
      const utils = await render();
      const dispatchSpy = jest.spyOn(utils.store, 'dispatch');

      await act(() => user.click(getMenuButton()));
      await act(() => user.click(getDeleteButton()));
      await act(() => user.click(document.body));

      await waitFor(() => {
        expect(dispatchSpy).toBeCalledTimes(0);
      });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    const getMenuButton = () =>
      screen.getByRole('button', { name: textMock('schema_editor.open_action_menu') });
    const getDeleteButton = () =>
      screen.getByRole('menuitem', { name: textMock('schema_editor.delete') });
  });
});

const render = async (props: Partial<SchemaItemProps> = {}) => {
  const mockInitialState: SchemaState = {
    name: 'test',
    selectedDefinitionNodeId: '',
    selectedPropertyNodeId: '',
    selectedEditorTab: 'properties',
  };

  const allProps: SchemaItemProps = {
    selectedNode: {
      children: [],
      custom: {},
      fieldType: FieldType.Object,
      implicitType: false,
      isArray: false,
      isNillable: false,
      isRequired: false,
      objectKind: ObjectKind.Field,
      pointer: '#/$defs/Test',
      restrictions: {},
    },
    isPropertiesView: false,
    onLabelClick: jest.fn(),
    index: 0,
    ...props,
  };
  const uiSchema = buildUiSchema(dataMock);
  const schemaModel = SchemaModel.fromArray(uiSchema);

  return renderWithProviders({
    state: mockInitialState,
    appContextProps: { schemaModel },
  })(
    <DndProvider backend={HTML5Backend}>
      <SchemaItem {...allProps} />
    </DndProvider>,
  );
};
