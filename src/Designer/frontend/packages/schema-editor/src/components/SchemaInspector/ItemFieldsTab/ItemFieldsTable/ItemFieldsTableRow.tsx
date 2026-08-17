import type { ReactNode, KeyboardEvent, ChangeEventHandler } from 'react';
import { useState } from 'react';
import classes from './ItemFieldsTable.module.css';
import cn from 'classnames';
import {
  deleteNode,
  duplicateNode,
  setRequired,
  setPropertyName,
  type UiSchemaNode,
} from '@altinn/schema-model';
import { NameField } from '../../NameField';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { AltinnConfirmDialog } from 'app-shared/components';
import { useTranslation } from 'react-i18next';
import { FilesIcon, TrashIcon } from '@studio/icons';
import { StudioButton, StudioCenter, StudioSwitch } from '@studio/components';
import { nameFieldClass } from '@altinn/schema-editor/components/SchemaInspector/ItemFieldsTab/domUtils';
import { ItemFieldType } from './ItemFieldType';

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
  const { schemaModel, setSelectedUniquePointer, save } = useSchemaEditorAppContext();
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState<boolean>();

  const fullPath = fieldNode.schemaPointer;

  const handleChangeNodeName = (newNodeName: string) => {
    save(
      setPropertyName(schemaModel, {
        path: fullPath,
        name: newNodeName,
      }),
    );
  };

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
    setSelectedUniquePointer(null);
  };

  const duplicateHandler = () => {
    save(duplicateNode(schemaModel, fullPath));
  };

  return (
    <tr>
      <td className={cn(classes.tableColumnName, classes.tableCell)}>
        <NameField
          className={nameFieldClass}
          disabled={readonly}
          handleSave={handleChangeNodeName}
          hideLabel
          onKeyDown={onKeyDown}
          schemaPointer={fullPath}
          ariaLabel={t('schema_editor.field_name')}
        />
      </td>
      <td className={cn(classes.tableColumnType, classes.tableCell)}>
        <ItemFieldType fieldNode={fieldNode} />
      </td>
      <td className={cn(classes.tableColumnRequired, classes.tableCell)}>
        <StudioCenter>
          <StudioSwitch
            data-size='sm'
            aria-label={t('schema_editor.required')}
            checked={fieldNode?.isRequired ?? false}
            disabled={readonly}
            name='checkedArray'
            onChange={changeRequiredHandler}
          />
        </StudioCenter>
      </td>
      <td className={cn(classes.tableColumnDuplicate, classes.tableCell)}>
        <StudioCenter>
          <StudioButton
            title={t('schema_editor.duplicate_field')}
            aria-label={t('schema_editor.duplicate_field')}
            icon={<FilesIcon />}
            onClick={duplicateHandler}
            variant='tertiary'
          />
        </StudioCenter>
      </td>
      <td className={cn(classes.tableColumnDelete, classes.tableCell)}>
        <StudioCenter>
          <AltinnConfirmDialog
            open={isConfirmDeleteDialogOpen}
            confirmText={t('schema_editor.data_model_field_deletion_confirm')}
            onConfirm={deleteHandler}
            onClose={() => setIsConfirmDeleteDialogOpen(false)}
            triggerProps={{
              title: t('schema_editor.delete_field'),
              icon: <TrashIcon />,
              onClick: () => setIsConfirmDeleteDialogOpen((prevState) => !prevState),
              color: 'danger',
              variant: 'tertiary',
            }}
          >
            <p>{t('schema_editor.data_model_field_deletion_text')}</p>
            <p>{t('schema_editor.data_model_field_deletion_info')}</p>
          </AltinnConfirmDialog>
        </StudioCenter>
      </td>
    </tr>
  );
};
