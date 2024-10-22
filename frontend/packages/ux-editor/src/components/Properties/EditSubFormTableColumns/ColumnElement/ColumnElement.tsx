import React, { useState, type ReactElement } from 'react';
import classes from './ColumnElement.module.css';
import { type TableColumn } from '../types/TableColumn';
import { useTranslation } from 'react-i18next';
import { StudioLabelAsParagraph, StudioParagraph } from '@studio/components';
import { EditColumnElement } from './EditColumnElement';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { ITextResource } from 'app-shared/types/global';

export type ColumnElementProps = {
  component;
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
  component,
}: ColumnElementProps): ReactElement => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const { org, app } = useStudioEnvironmentParams();
  const { data: textResources } = useTextResourcesQuery(org, app);

  const headerContent =
    textResources.nb.find(
      (textResource: ITextResource) => textResource.id === tableColumn.headerContent,
    )?.value ?? tableColumn.headerContent;

  if (editing) {
    return (
      <EditColumnElement
        component={component}
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
    <div
      className={classes.wrapper}
      onClick={(_) => {
        setEditing(true);
      }}
    >
      <StudioLabelAsParagraph size='sm'>
        {t('ux_editor.properties_panel.subform_table_columns.column_header', { columnNumber })}
      </StudioLabelAsParagraph>
      <StudioParagraph size='sm'>{headerContent}</StudioParagraph>
    </div>
  );
};
