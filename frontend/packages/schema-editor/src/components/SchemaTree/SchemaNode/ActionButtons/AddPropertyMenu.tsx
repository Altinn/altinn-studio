import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAddProperty } from '../../../../hooks/useAddProperty';
import { FieldType, ObjectKind } from '@altinn/schema-model';
import { ActionButton } from './ActionButton';
import { DropdownMenu } from '@digdir/designsystemet-react';
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
          {propertyItems.map(({ kind, fieldType, icon: Icon }) => (
            <DropdownMenu.Item
              key={`${kind}-${fieldType}`}
              onClick={() => addPropertyAndClose(kind, fieldType)}
            >
              <Icon />
              {t(`schema_editor.add_${fieldType || kind}`)}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};

type PropertyItems = {
  kind: ObjectKind;
  fieldType?: FieldType;
  icon: (IconProps: IconProps) => JSX.Element;
};

export const propertyItems: PropertyItems[] = [
  { kind: ObjectKind.Field, fieldType: FieldType.Object, icon: ObjectIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.String, icon: StringIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.Integer, icon: NumberIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.Number, icon: NumberIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.Boolean, icon: BooleanIcon },
  { kind: ObjectKind.Combination, icon: CombinationIcon },
  { kind: ObjectKind.Reference, icon: ReferenceIcon },
];
