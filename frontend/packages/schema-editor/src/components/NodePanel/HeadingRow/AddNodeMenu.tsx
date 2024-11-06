import { StudioDropdownMenu } from '@studio/components';
import type { HeadingRowProps } from './HeadingRow';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import React from 'react';
import {
  BooleanIcon,
  CombinationIcon,
  NumberIcon,
  ObjectIcon,
  PlusIcon,
  StringIcon,
} from '@studio/icons';
import { useSchemaEditorAppContext } from '../../../hooks/useSchemaEditorAppContext';
import { useAddProperty } from '../../../hooks/useAddProperty';
import { FieldType, ObjectKind, SchemaModel } from '@altinn/schema-model';
import type { TranslationKey } from '@altinn-studio/language/type';

type AddNodeMenuProps = HeadingRowProps;

type AddNodeMenuItemProps = {
  titleKey: TranslationKey;
  icon: ReactNode;
  action: () => void;
};

export const AddNodeMenu = ({ schemaPointer }: AddNodeMenuProps) => {
  const { t } = useTranslation();
  const addNodeMenuItems = useAddNodeMenuItems(schemaPointer);

  return (
    <StudioDropdownMenu
      size='small'
      anchorButtonProps={{
        icon: <PlusIcon />,
        variant: 'secondary',
        children: t('schema_editor.add_node_of_type'),
      }}
    >
      {addNodeMenuItems.map((item) => (
        <AddNodeMenuItem key={item.titleKey} {...item} />
      ))}
    </StudioDropdownMenu>
  );
};

const useAddNodeMenuItems = (schemaPointer: string): AddNodeMenuItemProps[] => {
  const { setSelectedUniquePointer } = useSchemaEditorAppContext();
  const addNode = useAddProperty();

  const addAndSelectNode = (...params: Parameters<typeof addNode>) => {
    const newPointer = addNode(...params);
    if (newPointer) {
      const newUniquePointer = SchemaModel.getUniquePointer(newPointer);
      setSelectedUniquePointer(newUniquePointer);
    }
  };

  return [
    {
      titleKey: 'schema_editor.object',
      icon: <ObjectIcon />,
      action: () => addAndSelectNode(ObjectKind.Field, FieldType.Object, schemaPointer),
    },
    {
      titleKey: 'schema_editor.string',
      icon: <StringIcon />,
      action: () => addAndSelectNode(ObjectKind.Field, FieldType.String, schemaPointer),
    },
    {
      titleKey: 'schema_editor.integer',
      icon: <NumberIcon />,
      action: () => addAndSelectNode(ObjectKind.Field, FieldType.Integer, schemaPointer),
    },
    {
      titleKey: 'schema_editor.number',
      icon: <NumberIcon />,
      action: () => addAndSelectNode(ObjectKind.Field, FieldType.Number, schemaPointer),
    },
    {
      titleKey: 'schema_editor.boolean',
      icon: <BooleanIcon />,
      action: () => addAndSelectNode(ObjectKind.Field, FieldType.Boolean, schemaPointer),
    },
    {
      titleKey: 'schema_editor.combination',
      icon: <CombinationIcon />,
      action: () => addAndSelectNode(ObjectKind.Combination, undefined, schemaPointer),
    },
  ];
};

const AddNodeMenuItem = ({ titleKey, icon, action }: AddNodeMenuItemProps) => {
  const { t } = useTranslation();
  return (
    <StudioDropdownMenu.Item key={titleKey} icon={icon} onClick={action}>
      {t(titleKey)}
    </StudioDropdownMenu.Item>
  );
};
