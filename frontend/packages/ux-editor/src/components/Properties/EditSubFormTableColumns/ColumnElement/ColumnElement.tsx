import React, { type ReactElement, type ChangeEvent } from 'react';
import classes from './ColumnElement.module.css';
import { type TableColumn } from '../types/TableColumn';
import { useTranslation } from 'react-i18next';
import {
  StudioButton,
  StudioLabelAsParagraph,
  StudioToggleableTextfield,
} from '@studio/components';
import { KeyVerticalFillIcon, TrashFillIcon } from '@studio/icons';

export type ColumnElementProps = {
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
}: ColumnElementProps): ReactElement => {
  const { t } = useTranslation();

  const handleEditHeaderContent = (event: ChangeEvent<HTMLInputElement>) => {
    onEdit({ ...tableColumn, headerContent: event.target.value });
  };

  const handleEditQuery = (event: ChangeEvent<HTMLInputElement>) => {
    onEdit({
      ...tableColumn,
      cellContent: { ...tableColumn.cellContent, query: event.target.value },
    });
  };

  const handleEditDefault = (event: ChangeEvent<HTMLInputElement>) => {
    onEdit({
      ...tableColumn,
      cellContent: { ...tableColumn.cellContent, default: event.target.value },
    });
  };
  return (
    <div className={classes.wrapper}>
      <TableColumnHeader columnNumber={columnNumber} onDeleteColumn={onDeleteColumn} />
      <TableColumnToggleableTextfield
        label={t('ux_editor.properties_panel.subform_table_columns.header_content_label')}
        value={tableColumn.headerContent}
        onBlur={handleEditHeaderContent}
        required={true}
      />
      <TableColumnToggleableTextfield
        label={t('ux_editor.properties_panel.subform_table_columns.cell_content_query_label')}
        value={tableColumn.cellContent.query}
        onBlur={handleEditQuery}
        required={true}
      />
      <TableColumnToggleableTextfield
        label={t('ux_editor.properties_panel.subform_table_columns.cell_content_default_label')}
        value={tableColumn.cellContent.default}
        onBlur={handleEditDefault}
      />
    </div>
  );
};

type TableColumnHeaderProps = {
  columnNumber: number;
  onDeleteColumn: () => void;
};

const TableColumnHeader = ({
  columnNumber,
  onDeleteColumn,
}: TableColumnHeaderProps): ReactElement => {
  const { t } = useTranslation();

  return (
    <div className={classes.headerWrapper}>
      <StudioLabelAsParagraph size='sm'>
        {t('ux_editor.properties_panel.subform_table_columns.column_header', { columnNumber })}
      </StudioLabelAsParagraph>
      <StudioButton
        icon={<TrashFillIcon />}
        title={t('ux_editor.properties_panel.subform_table_columns.delete_column', {
          columnNumber,
        })}
        onClick={onDeleteColumn}
        color='danger'
        variant='secondary'
      />
    </div>
  );
};

type TableColumnToggleableTextfieldProps = {
  label: string;
  value: string;
  onBlur: (event: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
};

const TableColumnToggleableTextfield = ({
  label,
  value,
  onBlur,
  required = false,
}: TableColumnToggleableTextfieldProps): ReactElement => {
  return (
    <StudioToggleableTextfield
      inputProps={{
        icon: <KeyVerticalFillIcon />,
        label,
        value,
        size: 'sm',
        required,
        onBlur,
      }}
      viewProps={{
        children: (
          <span>
            <b>{label}:</b> {value}
          </span>
        ),
        variant: 'tertiary',
      }}
    />
  );
};
