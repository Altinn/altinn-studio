import React from 'react';
import { Divider, IconButton, makeStyles } from '@material-ui/core';
import { AltinnMenu, AltinnMenuItem } from 'app-shared/components';
import { ObjectKind } from '../../types/enums';

export interface SchemaItemLabelProps {
  icon: string;
  label: string;
  translate: (key: string) => string;
  limitedItem?: boolean;
  editMode: boolean;
  onAddProperty?: (type: ObjectKind) => void;
  onAddReference?: (type: ObjectKind) => void;
  onAddCombination?: (type: ObjectKind) => void;
  onDelete?: () => void;
  onImport?: () => void;
  onPromote?: () => void;
  onGoToType?: () => void;
}

const useStyles = makeStyles({
  contextButton: {
    borderRadius: 60,
    margin: 0,
    padding: 10,
    display: 'none',
    '.MuiTreeItem-root :hover > &': {
      display: 'block',
    },
  },
  propertiesLabel: {
    display: 'flex',
    alignItems: 'center',
    padding: 8,
  },
  label: {
    flexGrow: 1,
  },
  iconContainer: {
    background: '#022f51',
    textAlign: 'center',
    padding: '5px 0px 5px 0px',
    marginRight: 4,
    fontSize: '10px',
  },
});

export const SchemaItemLabel = ({ translate, ...props }: SchemaItemLabelProps) => {
  const [contextAnchor, setContextAnchor] = React.useState<any>(null);
  const classes = useStyles();
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
    <div className={classes.propertiesLabel}>
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
        id='open-context-menu-button'
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
        {props.onAddReference && !props.limitedItem && (
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
          <Divider key='delete-divider' />,
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
