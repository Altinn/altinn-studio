import { updateComponentWithSubform, filterOutTableColumn } from './editSubformTableColumnsUtils';
import { type FormItem } from '@altinn/ux-editor/types/FormItem';
import { ComponentType } from 'app-shared/types/ComponentType';
import { type TableColumn } from '../types/TableColumn';
import { componentMocks } from '../../../../testing/componentMocks';

// Mock data for testing
const mockTableColumn1: TableColumn = {
  headerContent: 'Header 1',
  cellContent: { query: 'query 1', default: 'default 1' },
};
const mockTableColumn2: TableColumn = {
  headerContent: 'Header 2',
  cellContent: { query: 'query 2' },
};
const mockTableColumn3: TableColumn = {
  headerContent: 'Header 3',
  cellContent: { query: 'query 3', default: 'default 3' },
};

const subformComponentMock = componentMocks[ComponentType.Subform];

describe('editSubformTableColumnsUtils', () => {
  describe('updateComponentWithSubform', () => {
    it('should add table columns to the component', () => {
      const tableColumnsToAdd = [mockTableColumn2, mockTableColumn3];

      const updatedComponent = updateComponentWithSubform(subformComponentMock, tableColumnsToAdd);

      expect(updatedComponent.tableColumns).toEqual([
        subformComponentMock.tableColumns[0],
        mockTableColumn2,
        mockTableColumn3,
      ]);
    });

    it('should handle case where the component has no initial tableColumns', () => {
      const componentWithoutColumns: FormItem<ComponentType.Subform> = {
        ...subformComponentMock,
        tableColumns: undefined,
      };

      const tableColumnsToAdd = [mockTableColumn2];

      const updatedComponent = updateComponentWithSubform(
        componentWithoutColumns,
        tableColumnsToAdd,
      );

      expect(updatedComponent.tableColumns).toEqual([mockTableColumn2]);
    });

    it('should return the same component if tableColumnsToAdd is an empty array', () => {
      const updatedComponent = updateComponentWithSubform(subformComponentMock, []);

      expect(updatedComponent.tableColumns).toEqual([subformComponentMock.tableColumns[0]]);
    });
  });

  describe('filterOutTableColumn', () => {
    it('should filter out the specified table column', () => {
      const tableColumns = [mockTableColumn1, mockTableColumn2, mockTableColumn3];

      const updatedTableColumns = filterOutTableColumn(tableColumns, mockTableColumn2);

      expect(updatedTableColumns).toEqual([mockTableColumn1, mockTableColumn3]);
    });

    it('should return the same array if tableColumnToRemove is not found', () => {
      const tableColumns = [mockTableColumn1, mockTableColumn3];

      const updatedTableColumns = filterOutTableColumn(tableColumns, mockTableColumn2);

      expect(updatedTableColumns).toEqual(tableColumns);
    });

    it('should return an empty array if the only column is removed', () => {
      const tableColumns = [mockTableColumn1];

      const updatedTableColumns = filterOutTableColumn(tableColumns, mockTableColumn1);

      expect(updatedTableColumns).toEqual([]);
    });

    it('should return the same array if it is empty', () => {
      const updatedTableColumns = filterOutTableColumn([], mockTableColumn1);

      expect(updatedTableColumns).toEqual([]);
    });
  });
});
