import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CombinationIcon,
  ReferenceIcon,
  ObjectIcon,
  StringIcon,
  BooleanIcon,
  DivideIcon,
  IntegerIcon,
  PlusIcon,
} from '@studio/icons';
import { ObjectKind, FieldType } from '@altinn/schema-model/index';
import { type StudioButtonProps, StudioDropdownMenu } from '@studio/components-legacy';

export interface AddPropertiesMenuProps {
  onItemClick?: (kind: ObjectKind, fieldType?: FieldType) => void;
  anchorButtonProps?: StudioButtonProps;
}

const propertyItems = [
  { kind: ObjectKind.Field, fieldType: FieldType.Object, icon: ObjectIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.String, icon: StringIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.Integer, icon: IntegerIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.Number, icon: DivideIcon },
  { kind: ObjectKind.Field, fieldType: FieldType.Boolean, icon: BooleanIcon },
  { kind: ObjectKind.Combination, icon: CombinationIcon },
  { kind: ObjectKind.Reference, icon: ReferenceIcon },
];

export const AddPropertiesMenu = ({ onItemClick, anchorButtonProps }: AddPropertiesMenuProps) => {
  const { t } = useTranslation();

  return (
    <StudioDropdownMenu
      anchorButtonProps={{
        children: t('schema_editor.add_property'),
        color: 'second',
        icon: <PlusIcon />,
        variant: 'secondary',
        ...anchorButtonProps,
      }}
      size='small'
      placement='bottom-start'
    >
      {propertyItems.map(({ kind, fieldType, icon: Icon }) => (
        <StudioDropdownMenu.Item
          key={`${kind}-${fieldType}`}
          onClick={() => onItemClick(kind, fieldType)}
          icon={<Icon />}
        >
          {t(`schema_editor.add_${fieldType || kind}`)}
        </StudioDropdownMenu.Item>
      ))}
    </StudioDropdownMenu>
  );
};
