import React, { ReactNode, KeyboardEvent, ChangeEventHandler, useState } from 'react';
import classes from './ItemFieldsTableRow.module.css';
import cn from 'classnames';
import { FieldType, UiSchemaNode, deleteNode, setType } from '@altinn/schema-model';
import { NameField } from '../../../NameField';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { Button, Select, Switch } from '@digdir/design-system-react';
import { AltinnConfirmDialog } from 'app-shared/components';
import { setRequired, setPropertyName } from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import { getTypeOptions } from '../../../helpers/options';
import { useDispatch } from 'react-redux';
import { removeSelection } from '../../../../../features/editor/schemaEditorSlice';
import { TrashIcon } from '@navikt/aksel-icons';

export type ItemFieldsTableRowProps = {
  fieldNode: UiSchemaNode & {
    domId: string;
  };
  readonly: boolean;
  onEnterKeyPress: () => void;
};

export const ItemFieldsTableRow = ({
  fieldNode,
  readonly,
  onEnterKeyPress,
}: ItemFieldsTableRowProps): ReactNode => {
  const { t } = useTranslation();
  const { data, save } = useSchemaEditorAppContext();
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState<boolean>();

  const dispatch = useDispatch();

  const fullPath = fieldNode.pointer;

  const handleChangeNodeName = (newNodeName: string) => {
    save(
      setPropertyName(data, {
        path: fullPath,
        name: newNodeName,
      }),
    );
  };

  const onChangeType = (path: string, type: FieldType) => save(setType(data, { path, type }));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    e?.key === 'Enter' && onEnterKeyPress && onEnterKeyPress();

  const changeRequiredHandler: ChangeEventHandler<HTMLInputElement> = (e) =>
    save(
      setRequired(data, {
        path: fullPath,
        required: e.target.checked,
      }),
    );

  const deleteHandler = () => {
    save(deleteNode(data, fullPath));
    dispatch(removeSelection(fullPath));
  };

  return (
    <tr className={classes.tableRow}>
      <td className={cn(classes.tableData, classes.tableData1)}>
        <NameField
          id={fieldNode.domId}
          disabled={readonly}
          handleSave={handleChangeNodeName}
          onKeyDown={onKeyDown}
          pointer={fullPath}
          aria-label={t('schema_editor.field_name')}
        />
      </td>
      <td className={cn(classes.tableData, classes.tableData2)}>
        <Select
          hideLabel
          inputId={`${fieldNode.domId}-typeselect`}
          label={t('schema_editor.type')}
          onChange={(fieldType) => onChangeType(fullPath, fieldType as FieldType)}
          options={getTypeOptions(t)}
          value={fieldNode.fieldType as FieldType}
        />
      </td>
      <td className={cn(classes.tableData, classes.tableData3)}>
        <Switch
          size='small'
          aria-label={t('schema_editor.required')}
          checked={fieldNode.isRequired ?? false}
          disabled={readonly}
          name='checkedArray'
          onChange={changeRequiredHandler}
        />
      </td>
      <td className={cn(classes.tableData, classes.tableData4)}>
        <AltinnConfirmDialog
          open={isConfirmDeleteDialogOpen}
          confirmText={t('schema_editor.datamodel_field_deletion_confirm')}
          onConfirm={deleteHandler}
          onClose={() => setIsConfirmDeleteDialogOpen(false)}
          trigger={
            <Button
              aria-label={t('schema_editor.delete_field')}
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
      </td>
    </tr>
  );
};
