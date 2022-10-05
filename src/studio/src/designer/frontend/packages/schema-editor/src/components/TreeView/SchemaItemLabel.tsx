import React from 'react';
import { IconButton } from '@material-ui/core';
import { AltinnMenu, AltinnMenuItem } from 'app-shared/components';
import { ObjectKind } from '@altinn/schema-model';
import classes from './SchemaItemLabel.module.css';
import { Divider } from '../common/Divider';
import classNames from 'classnames';

export interface SchemaItemLabelProps {
  icon: string;
  label: JSX.Element;
  translate: (key: string) => string;
  limitedItem?: boolean;
  isArray: boolean;
  isRef: boolean;
  editMode: boolean;
  onAddProperty?: (objectKind: ObjectKind) => void;
  onAddReference?: (objectKind: ObjectKind) => void;
  onAddCombination?: (objectKind: ObjectKind) => void;
  onDelete?: () => void;
  onImport?: () => void;
  onPromote?: () => void;
  onGoToType?: () => void;
}

export const SchemaItemLabel = ({ translate, isArray, isRef, ...props }: SchemaItemLabelProps) => {
  const [contextAnchor, setContextAnchor] = React.useState<any>(null);
  const handleContextMenuClick = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setContextAnchor(e.currentTarget);
  };
  const handleAddNode = (e: React.SyntheticEvent, objectKind: ObjectKind) => {
    e.stopPropagation();
    setContextAnchor(null);
    switch (objectKind) {
      case ObjectKind.Combination:
        props?.onAddCombination?.(objectKind);
        break;
      case ObjectKind.Reference:
        props?.onAddReference?.(objectKind);
        break;
      case ObjectKind.Field:
      default:
        props?.onAddProperty?.(objectKind);
    }
  };
  const handlePromoteClick = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setContextAnchor(null);
    props.onPromote?.();
  };
  const handleDeleteClick = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setContextAnchor(null);
    props.onDelete?.();
  };
  const handleGoToType = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setContextAnchor(null);
    props.onGoToType?.();
  };

  const handleCloseContextMenu = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setContextAnchor(null);
  };

  return (
    <div className={classNames(classes.propertiesLabel, { [classes.isArray]: isArray, [classes.isRef]: isRef })}>
      <div className={classes.label}>
        <span className={classes.iconContainer}>
          <i className={`fa ${props.icon}`} style={{ color: 'white', textAlign: 'center' }} />
        </span>{' '}
        {props.label}
      </div>
      <IconButton
        data-testid={'open-context-menu-button'}
        className={classes.contextButton}
        aria-controls='simple-menu'
        aria-haspopup='true'
        onClick={handleContextMenuClick}
      >
        <i className='fa fa-ellipsismenu' />
      </IconButton>
      <AltinnMenu
        id='root-properties-context-menu'
        anchorEl={contextAnchor}
        open={Boolean(contextAnchor)}
        onClose={handleCloseContextMenu}
      >
        {props.onAddReference && (
          <AltinnMenuItem
            id='add-reference-to-node-button'
            key='add_reference'
            onClick={(event) => handleAddNode(event, ObjectKind.Reference)}
            text={translate('add_reference')}
            iconClass='fa fa-datamodel-ref'
            disabled={!props.editMode}
          />
        )}
        {props.onAddProperty && !props.limitedItem && (
          <AltinnMenuItem
            id='add-field-to-node-button'
            key='add_field'
            onClick={(event) => handleAddNode(event, ObjectKind.Field)}
            text={translate('add_field')}
            iconClass='fa fa-datamodel-properties'
            disabled={!props.editMode}
          />
        )}
        {props.onAddCombination && !props.limitedItem && (
          <AltinnMenuItem
            id='add-combination-to-node-button'
            key='add_combination'
            onClick={(event) => handleAddNode(event, ObjectKind.Combination)}
            text={translate('add_combination')}
            iconClass='fa fa-group'
            disabled={!props.editMode}
          />
        )}
        {props.onPromote && !props.limitedItem && (
          <AltinnMenuItem
            id='promote-item-button'
            key='promote'
            onClick={handlePromoteClick}
            text={translate('promote')}
            iconClass='fa fa-arrowup'
            disabled={!props.editMode}
          />
        )}
        {props.onGoToType && (
          <AltinnMenuItem
            id='go-to-type-button'
            key='go_to_type'
            onClick={handleGoToType}
            text={translate('go_to_type')}
            iconClass='fa fa-datamodel-ref'
          />
        )}
        {props.onDelete && [
          <Divider key='delete-divider' inMenu />,
          <AltinnMenuItem
            id='delete-node-button'
            key='delete'
            onClick={handleDeleteClick}
            text={translate('delete')}
            iconClass='fa fa-trash'
            disabled={!props.editMode}
          />,
        ]}
      </AltinnMenu>
    </div>
  );
};
