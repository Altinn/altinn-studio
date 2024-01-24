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
  pointer: string;
  className: string;
}

export const ActionButtons = ({ pointer, className }: ActionButtonsProps) => {
  const savableModel = useSavableSchemaModel();
  const deleteNode = useDeleteNode(pointer, savableModel);
  const node = savableModel.getNode(pointer);

  const convertToReference = () => savableModel.convertToDefinition(pointer);
  const hasReferringNodes = savableModel.hasReferringNodes(pointer);
  const actionButtonTitleKey = hasReferringNodes
    ? 'schema_editor.disable_deletion_info_for_used_definition'
    : 'general.delete';

  return (
    <div className={cn(classes.root, className)}>
      {isNodeValidParent(node) && <AddPropertyMenu pointer={pointer} />}
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

const useDeleteNode = (pointer: string, savableModel: SavableSchemaModel) => {
  const { t } = useTranslation();
  const { setSelectedNodePointer } = useSchemaEditorAppContext();

  return useCallback(() => {
    if (confirm(t('schema_editor.datamodel_field_deletion_text'))) {
      setSelectedNodePointer(null);
      savableModel.deleteNode(pointer);
    }
  }, [savableModel, pointer, t, setSelectedNodePointer]);
};
