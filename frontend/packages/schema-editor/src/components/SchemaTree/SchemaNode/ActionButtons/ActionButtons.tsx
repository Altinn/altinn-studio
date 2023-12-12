import React from 'react';
import { Reference, TrashIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import classes from './ActionButtons.module.css';
import { SavableSchemaModel } from '@altinn/schema-editor/classes/SavableSchemaModel';
import cn from 'classnames';
import { isNodeValidParent, isReference } from '../../../../../../schema-model';
import { ActionButton } from './ActionButton';
import { AddPropertyMenu } from './AddPropertyMenu';

export interface ActionButtonsProps {
  pointer: string;
  savableModel: SavableSchemaModel;
  className: string;
}

export const ActionButtons = ({ savableModel, pointer, className }: ActionButtonsProps) => {
  const { t } = useTranslation();
  const node = savableModel.getNode(pointer);

  const deleteNode = () => {
    if (confirm(t('schema_editor.datamodel_field_deletion_text'))) {
      savableModel.deleteNodeAndSave(pointer);
    }
  };

  const convertToReference = () => savableModel.convertToDefinition(pointer);

  return (
    <div className={cn(classes.root, className)}>
      {isNodeValidParent(node) && <AddPropertyMenu pointer={pointer} savableModel={savableModel} />}
      {!isReference(node) && (
        <ActionButton
          icon={<Reference />}
          titleKey='schema_editor.promote'
          onClick={convertToReference}
        />
      )}
      <ActionButton
        color='danger'
        icon={<TrashIcon />}
        titleKey='general.delete'
        onClick={deleteNode}
      />
    </div>
  );
};
