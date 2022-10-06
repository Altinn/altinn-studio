import React, { SyntheticEvent, useState } from 'react';
import { IconButton } from '@material-ui/core';
import { AltinnMenu, AltinnMenuItem } from 'app-shared/components';
import {
  CombinationKind,
  FieldType,
  getNodeDisplayName,
  Keywords,
  makePointer,
  ObjectKind,
  UiSchemaNode,
} from '@altinn/schema-model';
import classes from './SchemaItemLabel.module.css';
import { Divider } from '../common/Divider';
import classNames from 'classnames';
import {
  addCombinationItem,
  addProperty,
  deleteCombinationItem,
  deleteProperty,
  navigateToType,
  promoteProperty,
} from '../../features/editor/schemaEditorSlice';
import { useDispatch } from 'react-redux';

export interface SchemaItemLabelProps {
  editMode: boolean;
  icon: string;
  refNode?: UiSchemaNode;
  selectedNode: UiSchemaNode;
  translate: (key: string) => string;
}

export const SchemaItemLabel = ({ editMode, icon, refNode, selectedNode, translate }: SchemaItemLabelProps) => {
  const dispatch = useDispatch();
  const [contextAnchor, setContextAnchor] = useState<any>(null);

  const handleGoToType = () => {
    if (selectedNode.ref) {
      dispatch(navigateToType({ id: selectedNode.ref }));
    }
  };
  const handleToggleContextMenuClick = (e: SyntheticEvent) => {
    e.stopPropagation();
    setContextAnchor(e.currentTarget);
  };

  const handleAddNode = (e: SyntheticEvent, objectKind: ObjectKind) => {
    e.stopPropagation();
    setContextAnchor(null);
    const { pointer } = selectedNode;
    const defaultFieldType: any = {
      [ObjectKind.Field]: FieldType.String,
      [ObjectKind.Combination]: CombinationKind.AllOf,
      [ObjectKind.Array]: FieldType.Array,
      [ObjectKind.Reference]: undefined,
    };
    const propertyProps = {
      objectKind,
      fieldType: defaultFieldType[objectKind],
      ref: objectKind === ObjectKind.Reference ? '' : undefined,
    };

    selectedNode.objectKind === ObjectKind.Combination
      ? dispatch(addCombinationItem({ path: pointer, props: propertyProps }))
      : dispatch(addProperty({ path: pointer, props: propertyProps }));
  };
  const handlePromoteClick = (e: SyntheticEvent) => {
    e.stopPropagation();
    setContextAnchor(null);
    dispatch(promoteProperty({ path: selectedNode.pointer }));
  };
  const handleDeleteClick = (e: SyntheticEvent) => {
    e.stopPropagation();
    setContextAnchor(null);
    selectedNode.objectKind === ObjectKind.Combination
      ? dispatch(deleteCombinationItem({ path: selectedNode.pointer }))
      : dispatch(deleteProperty({ path: selectedNode.pointer }));
  };

  const handleCloseContextMenu = (e: SyntheticEvent) => {
    e.stopPropagation();
    setContextAnchor(null);
  };

  const canAddReferenceToNode = true;
  const canAddFieldToNode = true;
  const canAddCombinationToNode = true;
  const canPromoteNodeToType = true;
  const canDeleteNode = true;

  const isArray = selectedNode.objectKind === ObjectKind.Array || refNode?.objectKind === ObjectKind.Array;
  const isRef = refNode || selectedNode.pointer.startsWith(makePointer(Keywords.Definitions));
  return (
    <div className={classNames(classes.propertiesLabel, { [classes.isArray]: isArray, [classes.isRef]: isRef })}>
      <div className={classes.label}>
        <span className={classes.iconContainer}>
          <i className={`fa ${icon}`} />
        </span>{' '}
        <span>{getNodeDisplayName(selectedNode)}</span>
        {selectedNode.isRequired && <span> *</span>}
        {refNode && (
          <span
            className={classes.referenceLabel}
            onClick={handleGoToType}
            onKeyUp={handleGoToType}
            role={'link'}
            tabIndex={-1}
          >
            {refNode.pointer}
          </span>
        )}
      </div>
      <IconButton
        data-testid='open-context-menu-button'
        className={classes.contextButton}
        aria-controls='simple-menu'
        aria-haspopup='true'
        onClick={handleToggleContextMenuClick}
      >
        <i className='fa fa-ellipsismenu' />
      </IconButton>
      <AltinnMenu
        id='root-properties-context-menu'
        anchorEl={contextAnchor}
        open={Boolean(contextAnchor)}
        onClose={handleCloseContextMenu}
      >
        {canAddReferenceToNode && (
          <AltinnMenuItem
            id='add-reference-to-node-button'
            key='add_reference'
            onClick={(event) => handleAddNode(event, ObjectKind.Reference)}
            text={translate('add_reference')}
            iconClass='fa fa-datamodel-ref'
            disabled={!editMode}
          />
        )}
        {canAddFieldToNode && (
          <AltinnMenuItem
            id='add-field-to-node-button'
            key='add_field'
            onClick={(event) => handleAddNode(event, ObjectKind.Field)}
            text={translate('add_field')}
            iconClass='fa fa-datamodel-properties'
            disabled={!editMode}
          />
        )}
        {canAddCombinationToNode && (
          <AltinnMenuItem
            id='add-combination-to-node-button'
            key='add_combination'
            onClick={(event) => handleAddNode(event, ObjectKind.Combination)}
            text={translate('add_combination')}
            iconClass='fa fa-group'
            disabled={!editMode}
          />
        )}
        {canPromoteNodeToType && (
          <AltinnMenuItem
            id='promote-item-button'
            key='promote'
            onClick={handlePromoteClick}
            text={translate('promote')}
            iconClass='fa fa-arrowup'
            disabled={!editMode}
          />
        )}
        {canDeleteNode && [
          <Divider key='delete-divider' inMenu />,
          <AltinnMenuItem
            id='delete-node-button'
            key='delete'
            onClick={handleDeleteClick}
            text={translate('delete')}
            iconClass='fa fa-trash'
            disabled={!editMode}
          />,
        ]}
      </AltinnMenu>
    </div>
  );
};
