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
} from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioDeleteButton, StudioDropdownMenu } from '@studio/components';
import {
  BooleanIcon,
  CombinationIcon,
  NumberIcon,
  ObjectIcon,
  PlusIcon,
  StringIcon,
} from '@studio/icons';
import { useSavableSchemaModel } from '../../../hooks/useSavableSchemaModel';
import type { TranslationKey } from '@altinn-studio/language/type';
import { useAddProperty } from '../../../hooks/useAddProperty';
import cn from 'classnames';

export interface HeadingRowProps {
  pointer?: string;
}

export const HeadingRow = ({ pointer }: HeadingRowProps) => {
  const { setSelectedUniqueNodePointer, selectedUniqueNodePointer, name, schemaModel } =
    useSchemaEditorAppContext();
  const isDataModelRoot = !pointer;
  const nodeRootPointer = isDataModelRoot ? ROOT_POINTER : pointer;
  const node = schemaModel.getNode(nodeRootPointer);
  const selectNodeRoot = () => setSelectedUniqueNodePointer(nodeRootPointer);
  const title = isDataModelRoot ? name : extractNameFromPointer(pointer);
  const isValidParent = isNodeValidParent(node);
  const isSelected = selectedUniqueNodePointer === nodeRootPointer;

  return (
    <div className={cn(classes.root, isSelected && classes.selected)}>
      <Heading level={1} className={classes.heading}>
        <StudioButton
          className={classes.headingButton}
          color='second'
          icon={<NodeIcon node={node} />}
          onClick={selectNodeRoot}
          variant='tertiary'
        >
          {title}
        </StudioButton>
      </Heading>
      {isValidParent && <AddNodeMenu pointer={pointer} />}
      {!isDataModelRoot && <DeleteButton pointer={pointer} />}
    </div>
  );
};

type AddNodeMenuProps = HeadingRowProps;

type AddNodeMenuItemProps = {
  titleKey: TranslationKey;
  icon: ReactNode;
  action: () => void;
};

const AddNodeMenu = ({ pointer }: AddNodeMenuProps) => {
  const { t } = useTranslation();
  const addNodeMenuItems = useAddNodeMenuItems(pointer);

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

const useAddNodeMenuItems = (pointer: string): AddNodeMenuItemProps[] => {
  const { setSelectedUniqueNodePointer } = useSchemaEditorAppContext();
  const addNode = useAddProperty();

  const addAndSelectNode = (...params: Parameters<typeof addNode>) => {
    const newPointer = addNode(...params);
    if (newPointer) setSelectedUniqueNodePointer(newPointer);
  };

  return [
    {
      titleKey: 'schema_editor.object',
      icon: <ObjectIcon />,
      action: () => addAndSelectNode(ObjectKind.Field, FieldType.Object, pointer),
    },
    {
      titleKey: 'schema_editor.string',
      icon: <StringIcon />,
      action: () => addAndSelectNode(ObjectKind.Field, FieldType.String, pointer),
    },
    {
      titleKey: 'schema_editor.integer',
      icon: <NumberIcon />,
      action: () => addAndSelectNode(ObjectKind.Field, FieldType.Integer, pointer),
    },
    {
      titleKey: 'schema_editor.number',
      icon: <NumberIcon />,
      action: () => addAndSelectNode(ObjectKind.Field, FieldType.Number, pointer),
    },
    {
      titleKey: 'schema_editor.boolean',
      icon: <BooleanIcon />,
      action: () => addAndSelectNode(ObjectKind.Field, FieldType.Boolean, pointer),
    },
    {
      titleKey: 'schema_editor.combination',
      icon: <CombinationIcon />,
      action: () => addAndSelectNode(ObjectKind.Combination, undefined, pointer),
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

const DeleteButton = ({ pointer }: DeleteButtonProps) => {
  const { t } = useTranslation();
  const savableModel = useSavableSchemaModel();
  const { setSelectedUniqueNodePointer, setSelectedTypePointer } = useSchemaEditorAppContext();

  const isInUse = savableModel.hasReferringNodes(pointer);

  const handleDelete = () => {
    setSelectedUniqueNodePointer(null);
    setSelectedTypePointer(null);
    savableModel.deleteNode(pointer);
  };

  return (
    <StudioDeleteButton
      disabled={isInUse}
      onDelete={handleDelete}
      confirmMessage={t('schema_editor.confirm_type_deletion')}
      size='small'
      title={isInUse ? t('schema_editor.cannot_delete_definition_in_use') : t('general.delete')}
    >
      {t('general.delete')}
    </StudioDeleteButton>
  );
};
