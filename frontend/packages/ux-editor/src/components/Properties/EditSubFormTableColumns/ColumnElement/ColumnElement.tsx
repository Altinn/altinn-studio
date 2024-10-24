import React, { useState, type ReactElement } from 'react';
import classes from './ColumnElement.module.css';
import { type TableColumn } from '../types/TableColumn';
import { useTranslation } from 'react-i18next';
import { StudioProperty } from '@studio/components';
import { EditColumnElement } from './EditColumnElement';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { ITextResource } from 'app-shared/types/global';

export type ColumnElementProps = {
  layoutSetName: string;
  tableColumn: TableColumn;
  columnNumber: number;
  onDeleteColumn: () => void;
  onEdit: (tableColumn: TableColumn) => void;
};

export const ColumnElement = ({
  tableColumn,
  columnNumber,
  onDeleteColumn,
  onEdit,
  layoutSetName,
}: ColumnElementProps): ReactElement => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const { org, app } = useStudioEnvironmentParams();
  const { data: textResources } = useTextResourcesQuery(org, app);

  const headerContent =
    textResources?.nb?.find(
      (textResource: ITextResource) => textResource.id === tableColumn.headerContent,
    )?.value ?? tableColumn.headerContent;

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
  return (
    <StudioProperty.Button
      className={classes.wrapper}
      onClick={(_) => {
        setEditing(true);
      }}
      property={t('ux_editor.properties_panel.subform_table_columns.column_header', {
        columnNumber,
      })}
      value={headerContent}
      withoutNegativeMargin={true}
    ></StudioProperty.Button>
  );
};
