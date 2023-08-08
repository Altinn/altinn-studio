import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SchemaItemProps } from './SchemaItem';
import { SchemaItem } from './SchemaItem';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { SchemaState } from '@altinn/schema-editor/types';
import { queryClientMock } from '../../../test/mocks/queryClientMock';
import { buildUiSchema, FieldType, ObjectKind } from '@altinn/schema-model';
import { QueryKey } from 'app-shared/types/QueryKey';
import { dataMock } from '../../mockData';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';

const user = userEvent.setup();

const uiSchema = buildUiSchema(dataMock);
const org = 'org';
const app = 'app';
const modelPath = 'test';
queryClientMock.setQueryData([QueryKey.Datamodel, org, app, modelPath], uiSchema);

describe('SchemaItem', () => {
  describe('Delete confirmation dialog', () => {
    afterEach(jest.clearAllMocks);

    it('should open the confirmation dialog when clicking the delete button', async () => {
      await render();

      const menuButton = screen.getByTestId('open-context-menu-button');
      await act(() => user.click(menuButton));

      const deleteButton = screen.getByText(textMock('delete'));
      await act(() => user.click(deleteButton));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const text = await screen.findByText(textMock('schema_editor.datamodel_field_deletion_text'));
      expect(text).toBeInTheDocument();

      const info = await screen.findByText(textMock('schema_editor.datamodel_field_deletion_info'));
      expect(info).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: textMock('schema_editor.datamodel_field_deletion_confirm') });
      expect(confirmButton).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should close the confirmation dialog when clicking the cancel button', async () => {
      await render();

      const menuButton = screen.getByTestId('open-context-menu-button');
      await act(() => user.click(menuButton));

      const deleteButton = screen.getByText(textMock('delete'));
      await act(() => user.click(deleteButton));

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      await act(() => user.click(cancelButton));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close when clicking outside the popover', async () => {
      await render();

      const menuButton = screen.getByTestId('open-context-menu-button');
      await act(() => user.click(menuButton));

      const deleteButton = screen.getByText(textMock('delete'));
      await act(() => user.click(deleteButton));

      await act(() => user.click(document.body));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
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
      isCombinationItem: false,
      isNillable: false,
      isRequired: false,
      objectKind: ObjectKind.Field,
      pointer: '#/$defs/TestType',
      restrictions: {},
    },
    translate: textMock,
    isPropertiesView: false,
    onLabelClick: jest.fn(),
    index: 0,
    ...props
  };

  return renderWithProviders({
    state: mockInitialState,
    appContextProps: { modelPath },
  })(<DndProvider backend={HTML5Backend}>
      <SchemaItem {...allProps} />
    </DndProvider>);
};
