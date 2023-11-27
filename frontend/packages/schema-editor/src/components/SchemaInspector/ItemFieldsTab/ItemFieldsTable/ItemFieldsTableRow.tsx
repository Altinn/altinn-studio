import React, { ReactNode, KeyboardEvent, ChangeEventHandler, useState } from 'react';
import classes from './ItemFieldsTable.module.css';
import cn from 'classnames';
import { FieldType, UiSchemaNode, deleteNode, setType } from '@altinn/schema-model';
import { NameField } from '../../NameField';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { Button, NativeSelect, Switch } from '@digdir/design-system-react';
import { AltinnConfirmDialog } from 'app-shared/components';
import { setRequired, setPropertyName } from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { removeSelection } from '../../../../features/editor/schemaEditorSlice';
import { TrashIcon } from '@navikt/aksel-icons';
import { Center } from 'app-shared/components/Center';
import { useTypeOptions } from '@altinn/schema-editor/components/SchemaInspector/hooks/useTypeOptions';

export type ItemFieldsTableRowProps = {
  fieldNode: UiSchemaNode & {
    domId: string;
  };
  readonly: boolean;
  onEnterKeyPress: () => void;
};

/**
 * @component
 *    Displays a row in the Item Fields Table
 *
 * @property {UiSchemaNode & { domId: string }}[fieldNoe] - The field node
 * @property {boolean}[readonly] - If the field is readonly or not
 * @property {function}[onEnterKeyPress] - Function to be executed on enter keypress
 *
 * @returns {ReactNode} - the rendered component
 */
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

  const onTypeChange = (path: string, type: FieldType) => save(setType(data, { path, type }));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    e?.key === 'Enter' && onEnterKeyPress && onEnterKeyPress();

  const changeRequiredHandler: ChangeEventHandler<HTMLInputElement> = (e) => {
    save(
      setRequired(data, {
        path: fullPath,
        required: e.target.checked,
      }),
    );
  };

  const deleteHandler = () => {
    save(deleteNode(data, fullPath));
    dispatch(removeSelection(fullPath));
  };

  return (
    <tr>
      <td className={cn(classes.tableColumnName, classes.tableCell)}>
        <NameField
          id={fieldNode.domId}
          disabled={readonly}
          handleSave={handleChangeNodeName}
          onKeyDown={onKeyDown}
          pointer={fullPath}
          size='small'
          aria-label={t('schema_editor.field_name')}
        />
      </td>
      <td className={cn(classes.tableColumnType, classes.tableCell)}>
        <TypeSelect
          id={`${fieldNode.domId}-typeselect`}
          onChange={(fieldType) => onTypeChange(fullPath, fieldType)}
          value={fieldNode.fieldType as FieldType}
        />
      </td>
      <td className={cn(classes.tableColumnRequired, classes.tableCell)}>
        <Center>
          <Switch
            className={classes.switch}
            size='small'
            aria-label={t('schema_editor.required')}
            checked={fieldNode?.isRequired ?? false}
            disabled={readonly}
            name='checkedArray'
            onChange={changeRequiredHandler}
          />
        </Center>
      </td>
      <td className={cn(classes.tableColumnDelete, classes.tableCell)}>
        <Center>
          <AltinnConfirmDialog
            open={isConfirmDeleteDialogOpen}
            confirmText={t('schema_editor.datamodel_field_deletion_confirm')}
            onConfirm={deleteHandler}
            onClose={() => setIsConfirmDeleteDialogOpen(false)}
            trigger={
              <Button
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
        </Center>
      </td>
    </tr>
  );
};

interface TypeSelectProps {
  id: string;
  onChange: (type: FieldType) => void;
  value: FieldType;
}

const TypeSelect = ({ id, onChange, value }: TypeSelectProps) => {
  const typeOptions = useTypeOptions();
  const { t } = useTranslation();
  return (
    <NativeSelect
      hideLabel
      id={id}
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
