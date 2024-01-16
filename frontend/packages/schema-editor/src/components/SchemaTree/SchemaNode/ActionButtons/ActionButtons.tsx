import React, { useCallback } from 'react';
import { ReferenceIcon, TrashIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import classes from './ActionButtons.module.css';
import cn from 'classnames';
import { isNodeValidParent, isReference } from '@altinn/schema-model';
import { isDefinition } from '../../../../../../schema-model/src/lib/utils';
import { ActionButton } from './ActionButton';
import { AddPropertyMenu } from './AddPropertyMenu';
import { useSavableSchemaModel } from '../../../../hooks/useSavableSchemaModel';
import { SavableSchemaModel } from '../../../../classes/SavableSchemaModel';
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
      {isDefinition(node) ? (
        <ActionButton
          color='danger'
          icon={<TrashIcon />}
          titleKey='schema_editor.disable_deletion_info_for_used_definition'
          onClick={deleteNode}
          disabled={true}
        />
      ) : (
        <ActionButton
          color='danger'
          icon={<TrashIcon />}
          titleKey='general.delete'
          onClick={deleteNode}
        />
      )}
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
