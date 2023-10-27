import React, { ReactNode } from 'react';
import classes from './ItemFieldsTable.module.css';
import cn from 'classnames';
import { UiSchemaNode, addProperty } from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import { ItemFieldsTableRow } from './ItemFieldsTableRow';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export type ItemFieldsTableProps = {
  fieldNodes: (UiSchemaNode & {
    domId: string;
  })[];
  readonly: boolean;
  selectedItem: UiSchemaNode;
};

/**
 * @component
 *    Displays the Item Fields as a table
 *
 * @property {(UiSchemaNode & { domId: string })[]}[fieldNoes] - The field nodes
 * @property {boolean}[readonly] - If the fields are readonly
 * @property {UiSchemaNode}[selectedItem] - The selected node
 *
 * @returns {ReactNode} - The rendered component
 */
export const ItemFieldsTable = ({
  fieldNodes,
  readonly,
  selectedItem,
}: ItemFieldsTableProps): ReactNode => {
  const { t } = useTranslation();
  const { data, save } = useSchemaEditorAppContext();

  const dispatchAddProperty = () =>
    save(addProperty(data, { pointer: selectedItem.pointer, props: {} }));

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
