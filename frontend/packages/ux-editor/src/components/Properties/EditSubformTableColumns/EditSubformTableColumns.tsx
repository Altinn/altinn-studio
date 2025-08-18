import React, { useState, type ReactElement, type ReactNode } from 'react';
import classes from './EditSubformTableColumns.module.css';
import { StudioHeading } from '@studio/components-legacy';
import { StudioButton } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { type IGenericEditComponent } from '../../config/componentConfig';
import { type ComponentType } from 'app-shared/types/ComponentType';
import { type TableColumn } from './types/TableColumn';
import { filterOutTableColumn, updateComponentWithSubform } from './utils';
import { useUniqueKeys } from '@studio/hooks';
import { ColumnElement } from './ColumnElement';
import { useSubformLayoutValidation } from './hooks/useSubformLayoutValidation';
import { SubformMissingContentWarning } from './SubformMissingContentWarning/SubformMissingContentWarning';
import cn from 'classnames';

export type EditSubformTableColumnsProps = IGenericEditComponent<ComponentType.Subform> & {
  className?: string;
};

export const EditSubformTableColumns = ({
  component,
  handleComponentChange,
  className,
}: EditSubformTableColumnsProps): ReactElement => {
  const [newColumnNumber, setNewColumnNumber] = useState<number>();
  const { t } = useTranslation();
  var subformLayoutIsConfigured = useSubformLayoutValidation(component.layoutSet);

  const tableColumns: TableColumn[] = component?.tableColumns ?? [];
  const { getUniqueKey, addUniqueKey, removeUniqueKey } = useUniqueKeys({
    numberOfKeys: tableColumns.length,
  });

  const handleAddColumn = () => {
    addUniqueKey();
    const updatedComponent = updateComponentWithSubform(component, [
      { headerContent: '', cellContent: { query: '', default: '' } },
    ]);
    setNewColumnNumber(tableColumns.length + 1);
    handleComponentChange(updatedComponent);
  };

  const deleteColumn = (tableColumnToRemove: TableColumn, index: number) => {
    const updatedColumns: TableColumn[] = filterOutTableColumn(tableColumns, tableColumnToRemove);
    removeUniqueKey(index);
    handleComponentChange({ ...component, tableColumns: updatedColumns });
  };

  const editColumn = (tableColumn: TableColumn, position: number) => {
    const updatedColumns = [...tableColumns];
    updatedColumns[position] = tableColumn;
    handleComponentChange({ ...component, tableColumns: updatedColumns });
  };

  if (subformLayoutIsConfigured === false) {
    return (
      <EditSubformTableColumnsWrapper className={className}>
        <SubformMissingContentWarning subformLayoutSetName={component.layoutSet} />
      </EditSubformTableColumnsWrapper>
    );
  }

  return (
    <EditSubformTableColumnsWrapper className={className}>
      {tableColumns.length > 0 &&
        tableColumns.map((tableColumn: TableColumn, index: number) => (
          <ColumnElement
            subformLayout={component.layoutSet}
            key={getUniqueKey(index)}
            tableColumn={tableColumn}
            columnNumber={index + 1}
            isInitialOpenForEdit={newColumnNumber === index + 1}
            onDeleteColumn={() => deleteColumn(tableColumn, index)}
            onChange={(updatedTableColumn: TableColumn) => editColumn(updatedTableColumn, index)}
          />
        ))}
      <StudioButton
        variant='secondary'
        icon={<PlusIcon />}
        className={classes.addColumnButton}
        onClick={handleAddColumn}
      >
        {t('ux_editor.properties_panel.subform_table_columns.add_column')}
      </StudioButton>
    </EditSubformTableColumnsWrapper>
  );
};

type EditSubformTableColumnsWrapperProps = {
  children: ReactNode;
  className?: string;
};

const EditSubformTableColumnsWrapper = ({
  children,
  className,
}: EditSubformTableColumnsWrapperProps) => {
  const { t } = useTranslation();
  return (
    <div className={cn(className ? className : classes.wrapper)}>
      <StudioHeading size='2xs' level={2}>
        {t('ux_editor.properties_panel.subform_table_columns.heading')}
      </StudioHeading>
      <div className={classes.contentWrapper}>{children}</div>
    </div>
  );
};
