import React, { ReactNode } from 'react';
import classes from './ItemFieldsTable.module.css';
import cn from 'classnames';
import { FieldNode, FieldType, ObjectKind } from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import { ItemFieldsTableRow } from './ItemFieldsTableRow';
import { useAddProperty } from '@altinn/schema-editor/hooks/useAddProperty';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export type ItemFieldsTableProps = {
  readonly: boolean;
  selectedItem: FieldNode;
};

/**
 * @component
 *    Displays the Item Fields as a table
 */
export const ItemFieldsTable = ({ readonly, selectedItem }: ItemFieldsTableProps): ReactNode => {
  const { t } = useTranslation();
  const { schemaModel } = useSchemaEditorAppContext();
  const addProperty = useAddProperty();

  const dispatchAddProperty = () =>
    addProperty(ObjectKind.Field, FieldType.String, selectedItem.pointer);

  const fieldNodes = schemaModel.getChildNodes(selectedItem.pointer);
  const displayTableRows = fieldNodes.map((fieldNode, i) => (
    <ItemFieldsTableRow
      fieldNode={fieldNode}
      key={i}
      readonly={readonly}
      onEnterKeyPress={dispatchAddProperty}
    />
  ));

  return (
    <table className={classes.table}>
      <thead>
        <tr>
          <th className={cn(classes.tableColumnName, classes.tableCell, classes.tableHeaderLeft)}>
            {t('schema_editor.field_name')}
          </th>
          <th className={cn(classes.tableColumnType, classes.tableCell, classes.tableHeaderLeft)}>
            {t('schema_editor.type')}
          </th>
          <th
            className={cn(
              classes.tableColumnRequired,
              classes.tableCell,
              classes.tableHeaderCenter,
            )}
          >
            {t('schema_editor.required')}
          </th>
          <th
            className={cn(classes.tableColumnDelete, classes.tableCell, classes.tableHeaderCenter)}
          >
            {t('schema_editor.delete')}
          </th>
        </tr>
      </thead>
      <tbody>{displayTableRows}</tbody>
    </table>
  );
};
