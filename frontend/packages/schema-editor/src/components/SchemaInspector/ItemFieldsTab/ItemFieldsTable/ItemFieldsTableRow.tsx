import type { ReactNode, KeyboardEvent, ChangeEventHandler } from 'react';
import React, { useState } from 'react';
import classes from './ItemFieldsTable.module.css';
import cn from 'classnames';
import type { FieldType, UiSchemaNode } from '@altinn/schema-model';
import { deleteNode, setType, isField } from '@altinn/schema-model';
import { NameField } from '../../NameField';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { NativeSelect, Switch } from '@digdir/design-system-react';
import { AltinnConfirmDialog } from 'app-shared/components';
import { setRequired, setPropertyName } from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@studio/icons';
import { StudioButton, StudioCenter } from '@studio/components';
import { useTypeOptions } from '@altinn/schema-editor/components/SchemaInspector/hooks/useTypeOptions';
import { nameFieldClass } from '@altinn/schema-editor/components/SchemaInspector/ItemFieldsTab/domUtils';

export type ItemFieldsTableRowProps = {
  fieldNode: UiSchemaNode;
  readonly: boolean;
  onEnterKeyPress: () => void;
};

/**
 * @component
 *    Displays a row in the Item Fields Table
 */
export const ItemFieldsTableRow = ({
  fieldNode,
  readonly,
  onEnterKeyPress,
}: ItemFieldsTableRowProps): ReactNode => {
  const { t } = useTranslation();
  const { schemaModel, setSelectedNodePointer, save } = useSchemaEditorAppContext();
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState<boolean>();

  const fullPath = fieldNode.pointer;

  const handleChangeNodeName = (newNodeName: string) => {
    save(
      setPropertyName(schemaModel, {
        path: fullPath,
        name: newNodeName,
      }),
    );
  };

  const onTypeChange = (path: string, type: FieldType) =>
    save(setType(schemaModel, { path, type }));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    e?.key === 'Enter' && onEnterKeyPress && onEnterKeyPress();

  const changeRequiredHandler: ChangeEventHandler<HTMLInputElement> = (e) => {
    save(
      setRequired(schemaModel, {
        path: fullPath,
        required: e.target.checked,
      }),
    );
  };

  const deleteHandler = () => {
    save(deleteNode(schemaModel, fullPath));
    setSelectedNodePointer(null);
  };

  return (
    <tr>
      <td className={cn(classes.tableColumnName, classes.tableCell)}>
        <NameField
          className={nameFieldClass}
          disabled={readonly}
          handleSave={handleChangeNodeName}
          onKeyDown={onKeyDown}
          pointer={fullPath}
          size='small'
          aria-label={t('schema_editor.field_name')}
        />
      </td>
      <td className={cn(classes.tableColumnType, classes.tableCell)}>
        {isField(fieldNode) && (
          <TypeSelect
            onChange={(fieldType) => onTypeChange(fullPath, fieldType)}
            value={fieldNode.fieldType as FieldType}
          />
        )}
      </td>
      <td className={cn(classes.tableColumnRequired, classes.tableCell)}>
        <StudioCenter>
          <Switch
            size='small'
            aria-label={t('schema_editor.required')}
            checked={fieldNode?.isRequired ?? false}
            disabled={readonly}
            name='checkedArray'
            onChange={changeRequiredHandler}
          />
        </StudioCenter>
      </td>
      <td className={cn(classes.tableColumnDelete, classes.tableCell)}>
        <StudioCenter>
          <AltinnConfirmDialog
            open={isConfirmDeleteDialogOpen}
            confirmText={t('schema_editor.datamodel_field_deletion_confirm')}
            onConfirm={deleteHandler}
            onClose={() => setIsConfirmDeleteDialogOpen(false)}
            trigger={
              <StudioButton
                title={t('schema_editor.delete_field')}
                icon={<TrashIcon />}
                onClick={() => setIsConfirmDeleteDialogOpen((prevState) => !prevState)}
                color='danger'
                variant='tertiary'
                size='small'
              />
            }
          >
            <p>{t('schema_editor.datamodel_field_deletion_text')}</p>
            <p>{t('schema_editor.datamodel_field_deletion_info')}</p>
          </AltinnConfirmDialog>
        </StudioCenter>
      </td>
    </tr>
  );
};

interface TypeSelectProps {
  onChange: (type: FieldType) => void;
  value: FieldType;
}

const TypeSelect = ({ onChange, value }: TypeSelectProps) => {
  const typeOptions = useTypeOptions();
  const { t } = useTranslation();
  return (
    <NativeSelect
      hideLabel
      label={t('schema_editor.type')}
      onChange={(event) => onChange(event.target.value as FieldType)}
      value={value}
      size='small'
    >
      {typeOptions.map(({ value: fieldType, label }) => (
        <option key={fieldType} value={fieldType}>
          {label}
        </option>
      ))}
    </NativeSelect>
  );
};
