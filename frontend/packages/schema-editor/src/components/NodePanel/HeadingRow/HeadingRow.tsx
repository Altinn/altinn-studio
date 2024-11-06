import classes from './HeadingRow.module.css';
import { NodeIcon } from '../../NodeIcon';
import type { ReactNode } from 'react';
import React from 'react';
import { useSchemaEditorAppContext } from '../../../hooks/useSchemaEditorAppContext';
import { useDeleteDataModelMutation } from '../../../../../../app-development/hooks/mutations';
import {
  extractNameFromPointer,
  FieldType,
  isNodeValidParent,
  ObjectKind,
  ROOT_POINTER,
  SchemaModel,
} from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import {
  StudioButton,
  StudioDeleteButton,
  StudioDropdownMenu,
  StudioHeading,
} from '@studio/components';
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
import { removeDataTypeIdsToSign } from 'app-shared/utils/bpmnUtils';
import { useDataModelToolbarContext } from '@altinn/schema-editor/contexts/DataModelToolbarContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateBpmn } from 'app-shared/hooks/useUpdateBpmn';

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
      <StudioHeading level={1}>
        <StudioButton
          className={classes.headingButton}
          color='second'
          icon={<NodeIcon node={node} />}
          onClick={selectNodeRoot}
          variant='tertiary'
        >
          {title}
        </StudioButton>
      </StudioHeading>
      {isValidParent && <AddNodeMenu schemaPointer={schemaPointer} />}
      {isDataModelRoot ? <DeleteModelButton /> : <DeleteTypeButton schemaPointer={schemaPointer} />}
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

const DeleteTypeButton = ({ schemaPointer }: HeadingRowProps) => {
  const { t } = useTranslation();
  const savableModel = useSavableSchemaModel();
  const { setSelectedUniquePointer, setSelectedTypePointer } = useSchemaEditorAppContext();

  const isInUse = savableModel.hasReferringNodes(schemaPointer);

  const handleDeleteType = () => {
    setSelectedUniquePointer(null);
    setSelectedTypePointer(null);
    savableModel.deleteNode(schemaPointer);
  };

  return (
    <StudioDeleteButton
      disabled={isInUse}
      onDelete={handleDeleteType}
      confirmMessage={t('schema_editor.confirm_type_deletion')}
      size='small'
      title={isInUse ? t('schema_editor.cannot_delete_definition_in_use') : t('general.delete')}
    >
      {t('general.delete')}
    </StudioDeleteButton>
  );
};

const DeleteModelButton = () => {
  const { t } = useTranslation();
  const { selectedOption } = useDataModelToolbarContext();
  const { mutate } = useDeleteDataModelMutation();
  const { org, app } = useStudioEnvironmentParams();
  const updateBpmn = useUpdateBpmn(org, app);

  const modelPath = selectedOption?.value.repositoryRelativeUrl;
  const schemaName = selectedOption?.value && selectedOption?.label;

  const handleDeleteModel = async () => {
    mutate(modelPath, {
      onSuccess: async () => {
        await updateBpmn(removeDataTypeIdsToSign([schemaName]));
      },
    });
  };

  return (
    <StudioDeleteButton
      onDelete={handleDeleteModel}
      confirmMessage={t('schema_editor.delete_model_confirm', { schemaName })}
      size='small'
      title={t('general.delete')}
    >
      {t('general.delete')}
    </StudioDeleteButton>
  );
};
