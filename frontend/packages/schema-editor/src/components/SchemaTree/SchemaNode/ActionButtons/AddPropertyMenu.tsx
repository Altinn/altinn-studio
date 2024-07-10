import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAddProperty } from '../../../../hooks/useAddProperty';
import { FieldType, ObjectKind } from '@altinn/schema-model';
import { ActionButton } from './ActionButton';
import { DropdownMenu } from '@digdir/design-system-react';
import {
  CombinationIcon,
  ReferenceIcon,
  PlusIcon,
  ObjectIcon,
  StringIcon,
  BooleanIcon,
  NumberIcon,
} from '@studio/icons';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import type { IconProps } from '@studio/icons';
import classes from './AddPropertyMenu.module.css';

interface AddPropertyMenuProps {
  pointer: string;
}

export const AddPropertyMenu = ({ pointer }: AddPropertyMenuProps) => {
  const { setSelectedNodePointer } = useSchemaEditorAppContext();
  const { t } = useTranslation();
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const addProperty = useAddProperty();

  const addPropertyAndClose = (kind: ObjectKind, fieldType?: FieldType) => {
    const childPointer = addProperty(kind, fieldType, pointer);
    setSelectedNodePointer(childPointer);
    closeDropdown();
  };

  const closeDropdown = () => setIsAddDropdownOpen(false);

  return (
    <DropdownMenu open={isAddDropdownOpen} onClose={closeDropdown} size='small' portal>
      <DropdownMenu.Trigger asChild>
        <ActionButton
          aria-expanded={isAddDropdownOpen}
          aria-haspopup='menu'
          icon={<PlusIcon />}
          onClick={() => setIsAddDropdownOpen(true)}
          titleKey='schema_editor.add_node_of_type'
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Group>
          {fieldTypes.map(({ fieldType, icon: Icon }) => (
            <DropdownMenu.Item
              key={fieldType}
              onClick={() => addPropertyAndClose(ObjectKind.Field, fieldType)}
            >
              <Icon />
              {t('schema_editor.add')}{' '}
              <span className={classes.fieldType}>{t(`schema_editor.${fieldType}`)}</span>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Item onClick={() => addPropertyAndClose(ObjectKind.Combination)}>
            <CombinationIcon />
            {t('schema_editor.add_combination')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => addPropertyAndClose(ObjectKind.Reference)}>
            <ReferenceIcon />
            {t('schema_editor.add_reference')}
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};

type fieldTypesProps = {
  kind: ObjectKind.Field;
  fieldType: FieldType;
  icon: (IconProps: IconProps) => JSX.Element;
};

const fieldTypes: fieldTypesProps[] = [
  { kind: ObjectKind.Field, fieldType: FieldType.Object, icon: ObjectIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.String, icon: StringIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.Integer, icon: NumberIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.Number, icon: NumberIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.Boolean, icon: BooleanIcon },
];
