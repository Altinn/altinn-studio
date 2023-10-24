import React, { ReactNode } from 'react';
import classes from './ItemFieldsTable.module.css';
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
    <table>
      <tr>
        <th className={classes.tableHeaderLeft}>{t('schema_editor.field_name')}</th>
        <th className={classes.tableHeaderLeft}>{t('schema_editor.type')}</th>
        <th className={classes.tableHeaderCenter}>{t('schema_editor.required')}</th>
        <th className={classes.tableHeaderCenter}>{t('schema_editor.delete')}</th>
      </tr>
      {displayTableRows}
    </table>
  );
};
