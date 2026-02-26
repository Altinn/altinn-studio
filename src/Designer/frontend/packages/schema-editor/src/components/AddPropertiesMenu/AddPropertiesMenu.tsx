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
import { ObjectKind, FieldType } from '@altinn/schema-model';
import { StudioDropdown } from '@studio/components';

export interface AddPropertiesMenuProps {
  onItemClick: (kind: ObjectKind, fieldType?: FieldType) => void;
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

export const AddPropertiesMenu = ({ onItemClick }: AddPropertiesMenuProps) => {
  const { t } = useTranslation();

  return (
    <StudioDropdown
      icon={<PlusIcon />}
      triggerButtonText={t('schema_editor.add_property')}
      triggerButtonVariant='secondary'
    >
      <StudioDropdown.List>
        {propertyItems.map(({ kind, fieldType, icon: Icon }) => (
          <StudioDropdown.Item key={`${kind}-${fieldType}`}>
            <StudioDropdown.Button icon={<Icon />} onClick={() => onItemClick(kind, fieldType)}>
              {t(`schema_editor.add_${fieldType || kind}`)}
            </StudioDropdown.Button>
          </StudioDropdown.Item>
        ))}
      </StudioDropdown.List>
    </StudioDropdown>
  );
};
