import React from 'react';
import { useTranslation } from 'react-i18next';
import { DropdownMenu } from '@digdir/designsystemet-react';
import {
  CombinationIcon,
  ReferenceIcon,
  ObjectIcon,
  StringIcon,
  BooleanIcon,
  NumberIcon,
} from '@studio/icons';
import { ObjectKind, FieldType } from '@altinn/schema-model';

interface AddPropertiesMenuProps {
  onItemClick?: (kind: ObjectKind, fieldType?: FieldType) => void;
}

const propertyItems = [
  { kind: ObjectKind.Field, fieldType: FieldType.Object, icon: ObjectIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.String, icon: StringIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.Integer, icon: NumberIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.Number, icon: NumberIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.Boolean, icon: BooleanIcon },
  { kind: ObjectKind.Combination, icon: CombinationIcon },
  { kind: ObjectKind.Reference, icon: ReferenceIcon },
];

export const AddPropertiesMenu = ({ onItemClick }: AddPropertiesMenuProps) => {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      {propertyItems.map(({ kind, fieldType, icon: Icon }) => (
        <DropdownMenu.Item
          key={`${kind}-${fieldType}`}
          onClick={() => onItemClick(kind, fieldType)}
        >
          <Icon />
          {t(`schema_editor.add_${fieldType || kind}`)}
        </DropdownMenu.Item>
      ))}
    </DropdownMenu>
  );
};
