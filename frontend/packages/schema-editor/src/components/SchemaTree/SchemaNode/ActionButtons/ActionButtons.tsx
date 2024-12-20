import React, { useCallback } from 'react';
import { ReferenceIcon, TrashIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import classes from './ActionButtons.module.css';
import cn from 'classnames';
import { isNodeValidParent, isReference } from '@altinn/schema-model';
import { ActionButton } from './ActionButton';
import { AddPropertyMenu } from './AddPropertyMenu';
import { useSavableSchemaModel } from '../../../../hooks/useSavableSchemaModel';
import type { SavableSchemaModel } from '../../../../classes/SavableSchemaModel';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export interface ActionButtonsProps {
  schemaPointer: string;
  uniquePointer: string;
  className: string;
}

export const ActionButtons = ({ schemaPointer, className, uniquePointer }: ActionButtonsProps) => {
  const savableModel = useSavableSchemaModel();
  const deleteNode = useDeleteNode(schemaPointer, savableModel);
  const node = savableModel.getNodeBySchemaPointer(schemaPointer);

  const convertToReference = () => savableModel.convertToDefinition(schemaPointer);
  const hasReferringNodes = savableModel.hasReferringNodes(schemaPointer);
  const actionButtonTitleKey = hasReferringNodes
    ? 'schema_editor.disable_deletion_info_for_used_definition'
    : 'general.delete';

  return (
    <div className={cn(classes.root, className)}>
      {isNodeValidParent(node) && (
        <AddPropertyMenu schemaPointer={schemaPointer} uniquePointer={uniquePointer} />
      )}
      {!isReference(node) && (
        <ActionButton
          icon={<ReferenceIcon />}
          titleKey='schema_editor.promote'
          onClick={convertToReference}
        />
      )}
      <ActionButton
        color='danger'
        icon={<TrashIcon />}
        titleKey={actionButtonTitleKey}
        onClick={deleteNode}
        disabled={hasReferringNodes}
      />
    </div>
  );
};

const useDeleteNode = (schemaPointer: string, savableModel: SavableSchemaModel) => {
  const { t } = useTranslation();
  const { setSelectedUniquePointer } = useSchemaEditorAppContext();

  return useCallback(() => {
    const confirmMessage = savableModel.areDefinitionParentsInUse(schemaPointer)
      ? t('schema_editor.data_model_definition_field_deletion_text')
      : t('schema_editor.data_model_field_deletion_text');
    if (confirm(confirmMessage)) {
      setSelectedUniquePointer(null);
      savableModel.deleteNode(schemaPointer);
    }
  }, [savableModel, schemaPointer, t, setSelectedUniquePointer]);
};
