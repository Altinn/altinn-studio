import React, { useState } from 'react';
import classes from './EnumList.module.css';
import type { FieldNode } from '@altinn/schema-model';
import { deepCopy } from 'app-shared/pure';
import { EnumField } from './EnumField';
import { ErrorMessage, Fieldset } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@studio/icons';
import { findDuplicateValues } from './utils';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { removeEmptyStrings, removeItemByIndex, replaceByIndex } from 'app-shared/utils/arrayUtils';
import { StudioButton } from '@studio/components';

export type EnumListProps = {
  schemaNode: FieldNode;
};

export const EnumList = ({ schemaNode }: EnumListProps): JSX.Element => {
  const { t } = useTranslation();
  const { schemaModel, save } = useSchemaEditorAppContext();

  const [enumList, setEnumList] = useState<string[]>(
    schemaNode?.enum ? deepCopy(schemaNode.enum) : [],
  );

  const [duplicateValues, setDuplicateValues] = useState<string[]>(null);

  const handleChange = (index: number, newEnum: string) => {
    const newEnumList = replaceByIndex(enumList, index, newEnum);
    update(newEnumList);
  };

  const handleDelete = (index: number) => {
    const newEnumList = removeItemByIndex(enumList, index);
    update(newEnumList);
  };

  const handleAddEnum = () => {
    const newEnumList = [...enumList, ''];
    setEnumList(newEnumList);
  };

  const update = (newEnumList: string[]) => {
    const duplicates: string[] = findDuplicateValues(newEnumList);

    if (duplicates === null) {
      const newNode = { ...schemaNode, enum: removeEmptyStrings(newEnumList) };
      save(schemaModel.updateNode(newNode.pointer, newNode));
    }

    setEnumList(newEnumList);
    setDuplicateValues(duplicates);
  };

  return (
    <Fieldset
      legend={t('schema_editor.enum_legend')}
      description={!schemaNode.enum?.length && t('schema_editor.enum_empty')}
    >
      {duplicateValues !== null && (
        <ErrorMessage>{t('schema_editor.enum_error_duplicate')}</ErrorMessage>
      )}
      {enumList.map((value: string, index: number) => (
        <EnumField
          key={`add-enum-field-${index}`}
          onChange={(newValue: string) => handleChange(index, newValue)}
          onDelete={() => handleDelete(index)}
          onEnterKeyPress={handleAddEnum}
          value={value}
          isValid={!duplicateValues?.includes(value)}
          index={index}
        />
      ))}
      <div className={classes.addEnumButton}>
        <StudioButton
          aria-label={t('schema_editor.add_enum')}
          color='second'
          fullWidth
          icon={<PlusIcon />}
          id='add-enum-button'
          onClick={handleAddEnum}
          size='small'
          variant='secondary'
        >
          {t('schema_editor.add_enum')}
        </StudioButton>
      </div>
    </Fieldset>
  );
};
