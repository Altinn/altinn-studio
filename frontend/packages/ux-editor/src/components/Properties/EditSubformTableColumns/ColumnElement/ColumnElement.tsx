import React, { useState, type ReactElement } from 'react';
import classes from './ColumnElement.module.css';
import { type TableColumn } from '../types/TableColumn';
import { useTranslation } from 'react-i18next';
import { StudioProperty } from '@studio/components';
import { EditColumnElement } from './EditColumnElement';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { textResourceByLanguageAndIdSelector } from '../../../../selectors/textResourceSelectors';

export type ColumnElementProps = {
  layoutSetName: string;
  tableColumn: TableColumn;
  columnNumber: number;
  initialOpen: boolean;
  onDeleteColumn: () => void;
  onEdit: (tableColumn: TableColumn) => void;
};

export const ColumnElement = ({
  tableColumn,
  columnNumber,
  initialOpen,
  onDeleteColumn,
  onEdit,
  layoutSetName,
}: ColumnElementProps): ReactElement => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(initialOpen);
  const { org, app } = useStudioEnvironmentParams();
  const { data: textResources } = useTextResourcesQuery(org, app);

  const textKeyValue = textResourceByLanguageAndIdSelector(
    'nb',
    tableColumn.headerContent,
  )(textResources)?.value;

  if (editing) {
    return (
      <EditColumnElement
        layoutSetName={layoutSetName}
        sourceColumn={tableColumn}
        columnNumber={columnNumber}
        onDeleteColumn={onDeleteColumn}
        onEdit={(col) => {
          setEditing(false);
          onEdit(col);
        }}
      />
    );
  }

  const handleClickEdit = (): void => {
    setEditing(true);
  };

  return (
    <StudioProperty.Button
      className={classes.wrapper}
      onClick={handleClickEdit}
      property={t('ux_editor.properties_panel.subform_table_columns.column_header', {
        columnNumber,
      })}
      value={textKeyValue}
    ></StudioProperty.Button>
  );
};
