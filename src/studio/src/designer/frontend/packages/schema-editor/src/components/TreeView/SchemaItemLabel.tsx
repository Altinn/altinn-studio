import React, { SyntheticEvent, useState } from 'react';
import { IconButton } from '@material-ui/core';
import { AltinnMenu, AltinnMenuItem } from 'app-shared/components';
import {
  Capabilites,
  CombinationKind,
  FieldType,
  getCapabilities,
  getNodeDisplayName,
  ObjectKind,
  pointerIsDefinition,
  UiSchemaNode,
} from '@altinn/schema-model';
import classes from './SchemaItemLabel.module.css';
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
import { Warning } from '@material-ui/icons';

export interface SchemaItemLabelProps {
  editMode: boolean;
  icon: string;
  refNode?: UiSchemaNode;
  itemsNode?: UiSchemaNode;
  selectedNode: UiSchemaNode;
  translate: (key: string) => string;
}

export const SchemaItemLabel = ({
  editMode,
  icon,
  refNode,
  itemsNode,
  selectedNode,
  translate,
}: SchemaItemLabelProps) => {
  const dispatch = useDispatch();
  const [contextAnchor, setContextAnchor] = useState<any>(null);

  // Simple wrapper to avoid repeating ourself...
  const wrapper = (callback: (arg: any) => void) => {
    return (e: SyntheticEvent, arg?: any) => {
      e.stopPropagation();
      setContextAnchor(null);
      callback(arg);
    };
  };

  const handleGoToType = () => dispatch(navigateToType({ id: selectedNode.ref }));
  const handleConvertToReference = wrapper(() => dispatch(promoteProperty({ path: selectedNode.pointer })));
  const handleConvertToField = wrapper(() => dispatch(promoteProperty({ path: selectedNode.pointer })));
  const handleCloseContextMenu = wrapper(() => undefined);

  const handleToggleContextMenuClick = (e: SyntheticEvent) => {
    e.stopPropagation();
    setContextAnchor(e.currentTarget);
  };

  const handleAddNode = wrapper((objectKind: ObjectKind) => {
    const props = {
      objectKind,
      fieldType: {
        [ObjectKind.Field]: FieldType.String,
        [ObjectKind.Combination]: CombinationKind.AllOf,
        [ObjectKind.Array]: FieldType.Array,
        [ObjectKind.Reference]: undefined,
      }[objectKind],
      ref: objectKind === ObjectKind.Reference ? '' : undefined,
    };
    const path = itemsNode?.pointer ?? selectedNode.pointer;
    selectedNode.objectKind === ObjectKind.Combination
      ? dispatch(addCombinationItem({ path, props }))
      : dispatch(addProperty({ path, props }));
  });

  const handleDeleteClick = wrapper(() =>
    selectedNode.objectKind === ObjectKind.Combination
      ? dispatch(deleteCombinationItem({ path: selectedNode.pointer }))
      : dispatch(deleteProperty({ path: selectedNode.pointer })),
  );

  const isArray = selectedNode.objectKind === ObjectKind.Array || refNode?.objectKind === ObjectKind.Array;

  const isRef = refNode || pointerIsDefinition(selectedNode.pointer);
  const capabilties = getCapabilities(itemsNode ?? selectedNode);
  return (
    <div className={classNames(classes.propertiesLabel, { [classes.isArray]: isArray, [classes.isRef]: isRef })}>
      <div className={classes.label} title={selectedNode.pointer}>
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
        {selectedNode.objectKind === ObjectKind.Reference && !refNode && (
          <span className={classes.warning}>
            <Warning />
            Kan ikke lagre modellen uten at type er satt.
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
        {capabilties.includes(Capabilites.CanHaveReferenceAdded) && (
          <AltinnMenuItem
            id='add-reference-to-node-button'
            key='add_reference'
            onClick={(event) => handleAddNode(event, ObjectKind.Reference)}
            text={translate('add_reference')}
            iconClass='fa fa-datamodel-ref'
            disabled={!editMode}
          />
        )}
        {capabilties.includes(Capabilites.CanHaveFieldAdded) && (
          <AltinnMenuItem
            id='add-field-to-node-button'
            key='add_field'
            onClick={(event) => handleAddNode(event, ObjectKind.Field)}
            text={translate('add_field')}
            iconClass='fa fa-datamodel-properties'
            disabled={!editMode}
          />
        )}
        {capabilties.includes(Capabilites.CanHaveCombinationAdded) && (
          <AltinnMenuItem
            id='add-combination-to-node-button'
            key='add_combination'
            onClick={(event) => handleAddNode(event, ObjectKind.Combination)}
            text={translate('add_combination')}
            iconClass='fa fa-group'
            disabled={!editMode}
          />
        )}
        {capabilties.includes(Capabilites.CanBeConvertedToReference) && (
          <AltinnMenuItem
            id='convert-node-to-reference-button'
            key='convert-node-to-reference'
            onClick={handleConvertToReference}
            text={translate('promote')}
            iconClass='fa fa-arrowup'
            disabled={!editMode}
          />
        )}
        {capabilties.includes(Capabilites.CanBeConvertedToField) && (
          <AltinnMenuItem
            id='convert-node-to-field-buttonn'
            key='convert-node-to-field'
            onClick={handleConvertToField}
            text={translate('convert_to_field')}
            iconClass='fa fa-arrowdown'
            disabled={true}
          />
        )}
        {capabilties.includes(Capabilites.CanBeDeleted) && (
          <AltinnMenuItem
            id='delete-node-button'
            key='delete'
            className={classes.contextMenuLastItem}
            onClick={handleDeleteClick}
            text={translate('delete')}
            iconClass='fa fa-trash'
            disabled={!editMode}
          />
        )}
      </AltinnMenu>
    </div>
  );
};
