import classes from './HeadingRow.module.css';
import { Heading } from '@digdir/designsystemet-react';
import { NodeIcon } from '../../NodeIcon';
import type { ReactNode } from 'react';
import React from 'react';
import { useSchemaEditorAppContext } from '../../../hooks/useSchemaEditorAppContext';
import {
  extractNameFromPointer,
  FieldType,
  isNodeValidParent,
  ObjectKind,
  ROOT_POINTER,
  SchemaModel,
} from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import { StudioDropdownMenu } from '@studio/components-legacy';
import { StudioDeleteButton, StudioButton } from '@studio/components';

import {
  BooleanIcon,
  CombinationIcon,
  IntegerIcon,
  DivideIcon,
  ObjectIcon,
  PlusIcon,
  StringIcon,
} from '@studio/icons';
import { useSavableSchemaModel } from '../../../hooks/useSavableSchemaModel';
import type { TranslationKey } from '@altinn-studio/language/type';
import { useAddProperty } from '../../../hooks/useAddProperty';
import cn from 'classnames';

export interface HeadingRowProps {
  schemaPointer?: string;
}

export const HeadingRow = ({ schemaPointer }: HeadingRowProps) => {
  const { setSelectedUniquePointer, selectedUniquePointer, name, schemaModel } =
    useSchemaEditorAppContext();
  const isDataModelRoot = !schemaPointer;
  const nodeRootPointer = isDataModelRoot ? ROOT_POINTER : schemaPointer;
  const node = schemaModel.getNodeBySchemaPointer(nodeRootPointer);
  const selectNodeRoot = () => setSelectedUniquePointer(nodeRootPointer);
  const title = isDataModelRoot ? name : extractNameFromPointer(schemaPointer);
  const isValidParent = isNodeValidParent(node);
  const isSelected = selectedUniquePointer === nodeRootPointer;

  return (
    <div className={cn(classes.root, isSelected && classes.selected)}>
      <Heading level={1} className={classes.heading}>
        <StudioButton
          className={classes.headingButton}
          icon={<NodeIcon node={node} />}
          onClick={selectNodeRoot}
          variant='tertiary'
        >
          {title}
        </StudioButton>
      </Heading>
      {isValidParent && <AddNodeMenu schemaPointer={schemaPointer} />}
      {!isDataModelRoot && <DeleteButton schemaPointer={schemaPointer} />}
    </div>
  );
};

type AddNodeMenuProps = HeadingRowProps;

type AddNodeMenuItemProps = {
  titleKey: TranslationKey;
  icon: ReactNode;
  action: () => void;
};

const AddNodeMenu = ({ schemaPointer }: AddNodeMenuProps) => {
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
      icon: <IntegerIcon />,
      action: () => addAndSelectNode(ObjectKind.Field, FieldType.Integer, schemaPointer),
    },
    {
      titleKey: 'schema_editor.number',
      icon: <DivideIcon />,
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

type DeleteButtonProps = HeadingRowProps;

const DeleteButton = ({ schemaPointer }: DeleteButtonProps) => {
  const { t } = useTranslation();
  const savableModel = useSavableSchemaModel();
  const { setSelectedUniquePointer, setSelectedTypePointer } = useSchemaEditorAppContext();

  const isInUse = savableModel.hasReferringNodes(schemaPointer);

  const handleDelete = () => {
    setSelectedUniquePointer(null);
    setSelectedTypePointer(null);
    savableModel.deleteNode(schemaPointer);
  };

  return (
    <StudioDeleteButton
      disabled={isInUse}
      onDelete={handleDelete}
      confirmMessage={t('schema_editor.confirm_type_deletion')}
      title={isInUse ? t('schema_editor.cannot_delete_definition_in_use') : t('general.delete')}
    >
      {t('general.delete')}
    </StudioDeleteButton>
  );
};
